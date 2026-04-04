import PDFDocument from "pdfkit";
import { Readable } from "stream";

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

    // Título
    doc.fontSize(18).font("Helvetica-Bold").text("Advertência Disciplinar", { align: "center" });
    doc.moveDown(0.5);

    // Linha separadora
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.8);

    // Seção Empresa
    doc.fontSize(11).font("Helvetica-Bold").text("Empresa:", 40);
    doc.fontSize(10).font("Helvetica").text(data.companyName, 40);
    doc.text(data.companyAddress, 40);
    doc.text(`${data.companyZipCode} - ${data.companyCity}`, 40);
    
    // CNPJ na mesma linha que Estado
    const cnpjY = doc.y;
    doc.text(`${data.companyState}`, 480);
    doc.fontSize(9).font("Helvetica-Bold").text("CNPJ", 40, cnpjY);
    doc.fontSize(9).font("Helvetica").text(data.companyCNPJ, 40, cnpjY + 15);
    doc.fontSize(9).font("Helvetica-Bold").text("00.766.315/0009-00", 480, cnpjY);
    
    doc.moveDown(1.5);

    // Seção Empregado
    doc.fontSize(11).font("Helvetica-Bold").text("Empregado:", 40);
    doc.fontSize(10).font("Helvetica").text(data.employeeName, 40);
    doc.moveDown(0.3);

    // Tabela de dados do empregado
    const tableY = doc.y;
    const col1X = 40;
    const col2X = 200;
    const col3X = 380;

    doc.fontSize(9).font("Helvetica-Bold").text("CPF", col1X, tableY);
    doc.fontSize(9).font("Helvetica").text(data.employeeCPF, col1X, tableY + 15);

    doc.fontSize(9).font("Helvetica-Bold").text("CTPS", col2X, tableY);
    doc.fontSize(9).font("Helvetica").text(data.employeeCTPS, col2X, tableY + 15);

    doc.fontSize(9).font("Helvetica-Bold").text("Matrícula", col3X, tableY);
    doc.fontSize(9).font("Helvetica").text(data.employeeMatricula, col3X, tableY + 15);

    doc.moveDown(2.5);

    // Descrição da advertência
    doc.fontSize(10).font("Helvetica").text(
      "Tem esta a finalidade de aplicar-lhe a pena de advertência disciplinar, em razão da(s) ocorrência(s):",
      { align: "justify", width: 475 }
    );
    doc.moveDown(0.5);

    // Motivo detalhado
    const motivo = `Após análise na data de hoje, Prezado Sr. ${data.employeeName}, vem por meio desta aplicar-lhe ADVERTÊNCIA DISCIPLINAR, em razão dos fatos apurados.

Constatou-se que, no dia ${data.warningDate}, Vossa Senhoria deixou de realizar o devido abastecimento do veículo de propriedade da empresa, ocasionando a falta de óleo diesel e gerando transtornos operacionais, atrasos e prejuízos ao bom andamento das atividades. Ressaltamos que o abastecimento adequado do veículo é responsabilidade inerente à função exercida, sendo imprescindível para a continuidade e eficiência das operações.

Verificou-se, ainda, que na mesma data, Vossa Senhoria realizou excesso de jornada de trabalho sem a devida autorização do gestor responsável, com início às 09h27min, término às 20h23min, intervalo para refeição de 1h02min, totalizando 10h56min de trabalho, em desacordo com as normas internas da empresa e a legislação vigente, que exigem autorização prévia para a realização de horas extras, especialmente visando a segurança do colaborador e a conformidade legal.

Destacamos que o descumprimento das responsabilidades inerentes à função e das normas internas pode acarretar prejuízos significativos ao desempenho das atividades da empresa, além de comprometer a segurança operacional. Informamos ainda que este é o primeiro contato formal com Vossa Senhoria acerca dos fatos relatados, após a devida apuração em observância ao princípio da imediatidade da medida disciplinar.

Diante do exposto, fica Vossa Senhoria formalmente advertida, nos termos do disposto na alínea "e" do Art. 482 da Consolidação das Leis do Trabalho (CLT).

Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa registrará a entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por justa causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solidarizamo-lhe que observe as normas reguladoras da relação de emprego.`;

    doc.fontSize(9).font("Helvetica").text(motivo, {
      align: "justify",
      width: 475,
      lineGap: 3,
    });

    doc.moveDown(1);

    // Fecho
    doc.fontSize(10).font("Helvetica").text("Favor dar ciente na cópia desta.", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`${data.warningLocation}, ${data.warningDate}.`, { align: "center" });

    doc.moveDown(2);

    // Linhas de assinatura
    const signatureY = doc.y;
    const lineLength = 120;
    const line1X = 60;
    const line2X = 340;

    // Linha 1 (Empresa)
    doc.moveTo(line1X, signatureY + 40).lineTo(line1X + lineLength, signatureY + 40).stroke();
    doc.fontSize(9).font("Helvetica").text("TRANSPORTESFRAMENTOLTDA", line1X - 20, signatureY + 45, {
      width: lineLength + 40,
      align: "center",
    });

    // Linha 2 (Empregado)
    doc.moveTo(line2X, signatureY + 40).lineTo(line2X + lineLength, signatureY + 40).stroke();
    doc.fontSize(9).font("Helvetica").text(data.employeeName, line2X - 20, signatureY + 45, {
      width: lineLength + 40,
      align: "center",
    });

    doc.moveDown(3);

    // Rodapé
    const footerY = doc.page.height - 30;
    doc.fontSize(8).font("Helvetica").text(`FPD0131.COL - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}`, 40, footerY);
    doc.fontSize(8).font("Helvetica").text(data.companyName, { align: "center" });

    doc.end();
  });
}
