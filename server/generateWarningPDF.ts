import PDFDocument from "pdfkit";

export interface WarningPDFData {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZipCode: string;
  companyCNPJ: string;
  employeeName: string;
  employeeCPF: string;
  employeeCTPS: string;
  employeeMatricula: string;
  warningDate: string;
  warningLocation: string;
  warningReason: string;
  warningDescription: string;
  warningType: string;
  warningLevel: number;
}

export async function generateWarningPDF(data: WarningPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Título
    doc.fontSize(16).font("Helvetica-Bold").text("Advertência Disciplinar", {
      align: "center",
    });
    doc.moveDown(0.3);

    // Linha separadora
    doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown(0.8);

    // Seção Empresa
    doc.fontSize(10).font("Helvetica-Bold").text("Empresa:", margin);
    doc.fontSize(9).font("Helvetica").text(data.companyName, margin);
    doc.fontSize(9).font("Helvetica").text(data.companyAddress, margin);
    doc.fontSize(9).font("Helvetica").text(`${data.companyZipCode} - ${data.companyCity}`, margin);

    // CNPJ e Estado em linha separada
    const cnpjY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").text("CNPJ", margin);
    doc.fontSize(9).font("Helvetica").text(data.companyCNPJ, margin, cnpjY + 12);

    // Estado na direita
    doc.fontSize(9).font("Helvetica-Bold").text(data.companyState, pageWidth - margin - 100);
    doc.moveDown(1);

    // Seção Empregado
    doc.fontSize(10).font("Helvetica-Bold").text("Empregado:", margin);
    doc.fontSize(9).font("Helvetica").text(data.employeeName, margin);
    doc.moveDown(0.4);

    // Tabela de dados do empregado
    const tableY = doc.y;
    const col1X = margin;
    const col2X = margin + 150;
    const col3X = margin + 300;

    doc.fontSize(8).font("Helvetica-Bold").text("CPF", col1X, tableY);
    doc.fontSize(8).font("Helvetica").text(data.employeeCPF, col1X, tableY + 12);

    doc.fontSize(8).font("Helvetica-Bold").text("CTPS", col2X, tableY);
    doc.fontSize(8).font("Helvetica").text(data.employeeCTPS, col2X, tableY + 12);

    doc.fontSize(8).font("Helvetica-Bold").text("Matrícula", col3X, tableY);
    doc.fontSize(8).font("Helvetica").text(data.employeeMatricula, col3X, tableY + 12);

    doc.moveDown(2.2);

    // Descrição da advertência
    const descriptionStart = doc.y;
    doc.fontSize(9).font("Helvetica").text(
      "Tem esta a finalidade de aplicar-lhe a pena de advertência disciplinar, em razão da(s) ocorrência(s):",
      margin,
      descriptionStart,
      { width: contentWidth, align: "justify" }
    );
    doc.moveDown(0.6);

    // Motivo detalhado
    const motivo = `Após análise na data de hoje, Prezado Sr. ${data.employeeName}, vem por meio desta aplicar-lhe ADVERTÊNCIA DISCIPLINAR, em razão dos fatos apurados.

Constatou-se que, no dia ${data.warningDate}, Vossa Senhoria deixou de realizar o devido abastecimento do veículo de propriedade da empresa, ocasionando a falta de óleo diesel e gerando transtornos operacionais, atrasos e prejuízos ao bom andamento das atividades. Ressaltamos que o abastecimento adequado do veículo é responsabilidade inerente à função exercida, sendo imprescindível para a continuidade e eficiência das operações.

Verificou-se, ainda, que na mesma data, Vossa Senhoria realizou excesso de jornada de trabalho sem a devida autorização do gestor responsável, com início às 09h27min, término às 20h23min, intervalo para refeição de 1h02min, totalizando 10h56min de trabalho, em desacordo com as normas internas da empresa e a legislação vigente, que exigem autorização prévia para a realização de horas extras, especialmente visando a segurança do colaborador e a conformidade legal.

Destacamos que o descumprimento das responsabilidades inerentes à função e das normas internas pode acarretar prejuízos significativos ao desempenho das atividades da empresa, além de comprometer a segurança operacional. Informamos ainda que este é o primeiro contato formal com Vossa Senhoria acerca dos fatos relatados, após a devida apuração em observância ao princípio da imediatidade da medida disciplinar.

Diante do exposto, fica Vossa Senhoria formalmente advertida, nos termos do disposto na alínea "e" do Art. 482 da Consolidação das Leis do Trabalho (CLT).

Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa registrará a entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por justa causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solidarizamo-lhe que observe as normas reguladoras da relação de emprego.`;

    doc.fontSize(8).font("Helvetica").text(motivo, margin, doc.y, {
      width: contentWidth,
      align: "justify",
      lineGap: 2,
    });

    doc.moveDown(1);

    // Fecho
    doc.fontSize(9).font("Helvetica").text("Favor dar ciente na cópia desta.", {
      align: "center",
    });
    doc.fontSize(9).font("Helvetica").text(`${data.warningLocation}, ${data.warningDate}.`, {
      align: "center",
    });

    doc.moveDown(2);

    // Linhas de assinatura
    const signatureY = doc.y;
    const lineLength = 110;
    const line1X = margin + 20;
    const line2X = margin + 280;

    // Linha 1 (Empresa)
    doc.moveTo(line1X, signatureY + 35).lineTo(line1X + lineLength, signatureY + 35).stroke();
    doc.fontSize(8).font("Helvetica").text("TRANSPORTESFRAMENTOLTDA", line1X - 10, signatureY + 40, {
      width: lineLength + 20,
      align: "center",
    });

    // Linha 2 (Empregado)
    doc.moveTo(line2X, signatureY + 35).lineTo(line2X + lineLength, signatureY + 35).stroke();
    doc.fontSize(8).font("Helvetica").text(data.employeeName, line2X - 10, signatureY + 40, {
      width: lineLength + 20,
      align: "center",
    });

    // Rodapé
    const footerY = pageHeight - 25;
    doc.fontSize(7).font("Helvetica").text(
      `FPD0131.COL - ${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR")}`,
      margin,
      footerY
    );
    doc.fontSize(7).font("Helvetica").text(data.companyName, margin, footerY + 12, {
      width: contentWidth,
      align: "center",
    });

    doc.end();
  });
}
