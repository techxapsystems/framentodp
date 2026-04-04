import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface WarningData {
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

export async function generateWarningPDF(data: WarningData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Título
    doc.fontSize(16).font('Helvetica-Bold').text('Advertência Disciplinar', {
      align: 'center',
    });

    doc.moveDown(0.5);

    // Seção de Dados da Empresa
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Empresa:', { underline: false });
    doc.font('Helvetica').fontSize(11);
    doc.text(data.companyName);
    doc.text(data.companyAddress);
    doc.text(`${data.companyZipCode} - ${data.companyCity}`, { continued: true });
    doc.text(`${data.companyState}`, { align: 'right' });

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('CNPJ', { continued: true });
    doc.font('Helvetica');
    doc.text(data.companyCNPJ, { align: 'right' });

    doc.moveDown(0.3);

    // Seção de Dados do Funcionário
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Empregado:', { underline: false });
    doc.font('Helvetica').fontSize(11);
    doc.text(data.employeeName);

    // Grid de CPF, CTPS e Matrícula
    const gridY = doc.y;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('CPF', 50, gridY);
    doc.text('CTPS', 250, gridY);
    doc.text('Matrícula', 400, gridY);

    doc.font('Helvetica').fontSize(11);
    doc.text(data.employeeCPF, 50, gridY + 20);
    doc.text(data.employeeCTPS, 250, gridY + 20);
    doc.text(data.employeeMatricula, 400, gridY + 20);

    doc.y = gridY + 50;
    doc.moveDown(0.5);

    // Parágrafo introdutório
    doc.fontSize(11).font('Helvetica');
    const introText = `Tem esta a finalidade de aplicar-lhe a pena de advertência disciplinar, em razão da(s) ocorrência(s):`;
    doc.text(introText, { align: 'justify' });

    doc.moveDown(0.3);

    // Descrição do motivo
    const reasonText = `Após análise na data de hoje, Prezado Sr. ${data.employeeName}, vem por meio desta aplicar-lhe ADVERTÊNCIA DISCIPLINAR, em razão dos fatos apurados.`;
    doc.text(reasonText, { align: 'justify' });

    doc.moveDown(0.2);

    // Descrição detalhada
    const descriptionText = `Constatou-se que, no dia ${data.warningDate}, Vossa Senhoria deixou de realizar o devido abastecimento do veículo de propriedade da empresa, placa EY0452, ocasionando a falta de óleo diesel e gerando transtornos operacionais, atrasos e prejuízos ao bom andamento das atividades. Ressaltamos que o abastecimento adequado do veículo é responsabilidade inerente à função exercida, sendo imprescindível para a continuidade e eficiência das operações.

Verificou-se, ainda, que na mesma data, Vossa Senhoria realizou excesso de jornada de trabalho sem a devida autorização do gestor responsável, com início às 09h27min, término às 20h23min, intervalo para refeição de 1h02min, totalizando 10h56min de trabalho, em desacordo com as normas internas da empresa e a legislação vigente, que exigem autorização prévia para a realização de horas extras, especialmente visando a segurança do colaborador e a conformidade legal.

Destacamos que o descumprimento das responsabilidades inerentes à função e das normas internas pode acarretar prejuízos significativos ao desempenho das atividades da empresa, além de comprometer a segurança operacional. Informamos ainda que este é o primeiro contato formal com Vossa Senhoria acerca dos fatos relatados, após a devida apuração em observância ao princípio da imediatidade da medida disciplinar.

Diante do exposto, fica Vossa Senhoria formalmente advertida, nos termos do disposto na alínea "e" do Art. 482 da Consolidação das Leis do Trabalho (CLT).

Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa registrará a entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.`;

    doc.fontSize(10).text(descriptionText, { align: 'justify' });

    doc.moveDown(0.5);

    // Parágrafo final
    const finalText = `Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por justa causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solidarizamos-lhe que observe as normas reguladoras da relação de emprego.`;
    doc.fontSize(10).text(finalText, { align: 'justify' });

    doc.moveDown(1);

    // Linha de fechamento
    doc.fontSize(11).text('Favor dar ciente na cópia desta.', { align: 'right' });
    doc.fontSize(11).text(`BETIM, ${new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}.`, { align: 'right' });

    doc.moveDown(1.5);

    // Linhas de assinatura
    const signatureY = doc.y;
    doc.moveTo(50, signatureY + 50).lineTo(200, signatureY + 50).stroke();
    doc.moveTo(350, signatureY + 50).lineTo(500, signatureY + 50).stroke();

    doc.fontSize(10).text(data.companyName, 50, signatureY + 55, { width: 150, align: 'center' });
    doc.text(data.employeeName, 350, signatureY + 55, { width: 150, align: 'center' });

    doc.moveDown(2);

    // Rodapé
    doc.fontSize(9).text(`FPD0131.COL - ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}`, 50, doc.page.height - 30);
    doc.fontSize(9).text(data.companyName, { align: 'center' });

    doc.end();
  });
}
