import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface WarningPDFData {
  conductorName: string;
  cpf?: string;
  ctps?: string;
  licensePlate?: string;
  operacao?: string;
  warningType: "advertencia" | "suspensao";
  warningReason: string;
  warningNote?: string;
  dataInicio?: string; // DD/MM/YYYY
  dataFim?: string; // DD/MM/YYYY
  dataRetorno?: string; // DD/MM/YYYY
  createdDate?: Date;
}

export async function generateWarningPDF(data: WarningPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", reject);

      // ===== TÍTULO =====
      const titleText =
        data.warningType === "suspensao"
          ? "Suspensão Disciplinar"
          : "Advertência Disciplinar";

      doc.fontSize(14).font("Helvetica-Bold").text(titleText, { align: "center" });
      doc.moveDown(0.3);

      // ===== DADOS DA EMPRESA =====
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Empresa:", 40, doc.y);

      doc.font("Helvetica").text("TRANSPORTES FRAMENTO LTDA", 100, doc.y - 12);
      doc.text("Contorno da Petrobras, 107", 100, doc.y);
      doc.text("32.669-500 - CHAPECÓ", 100, doc.y);

      // MG alinhado à direita
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("MG", 450, doc.y - 12, { align: "right" });

      doc.moveDown(0.2);

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("CNPJ:", 40, doc.y);
      doc.font("Helvetica").text("00.766.315/0009-00", 100, doc.y - 12);

      doc.moveDown(0.3);

      // ===== DADOS DO EMPREGADO =====
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Empregado:", 40, doc.y);
      doc.font("Helvetica").text(data.conductorName.toUpperCase(), 100, doc.y - 12);

      doc.moveDown(0.2);

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("CPF:", 40, doc.y);
      doc.font("Helvetica").text(data.cpf || "___.___.___-__", 100, doc.y - 12);

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("CTPS:", 300, doc.y, { width: 50 });
      doc.font("Helvetica").text(data.ctps || "_________    ____ - __", 350, doc.y - 12);

      doc.moveDown(0.4);

      // ===== PARÁGRAFO INTRODUTÓRIO =====
      const introText = `Tem esta a finalidade de aplicar-lhe a pena de ${
        data.warningType === "suspensao" ? "suspensão" : "advertência"
      } disciplinar, em razão da(s) seguinte(s) ocorrência(a):`;

      doc.fontSize(9).font("Helvetica");
      doc.text(introText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.2);

      // ===== DESCRIÇÃO DO MOTIVO =====
      doc.text(data.warningReason, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.2);

      // ===== OBSERVAÇÃO =====
      if (data.warningNote) {
        doc.text(data.warningNote, {
          align: "justify",
          width: 520,
        });
        doc.moveDown(0.2);
      }

      // ===== PERÍODO DE SUSPENSÃO =====
      if (
        data.warningType === "suspensao" &&
        (data.dataInicio || data.dataRetorno)
      ) {
        const suspensionText = `Dessa forma, comunicamos a aplicação de suspensão disciplinar, sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e empresa, com fundamento no Art. 482 da CLT, com início em ${data.dataInicio} e retorno às atividades em ${data.dataRetorno}.`;

        doc.text(suspensionText, {
          align: "justify",
          width: 520,
        });

        doc.moveDown(0.2);
      }

      // ===== PARÁGRAFO FINAL =====
      const finalText = `Solicitamos que Vossa Senhoria assine o recebimento desta comunicação. Em caso de recusa, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da penalidade.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;

      doc.text(finalText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.3);

      // ===== LOCAL E DATA =====
      const dataFormatada = new Date(data.createdDate || new Date()).toLocaleDateString(
        "pt-BR",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );

      doc.fontSize(9).font("Helvetica");
      doc.text("Favor dar ciente na cópia desta.", 40, doc.y);
      doc.moveDown(0.2);
      doc.text(`CHAPECÓ, ${dataFormatada}.`, 40, doc.y);

      doc.moveDown(0.5);

      // ===== LINHAS DE ASSINATURA =====
      const lineY = doc.y;
      const lineLength = 120;
      const line1X = 40;
      const line2X = 320;

      doc.strokeColor("#000000").lineWidth(0.5);
      doc.moveTo(line1X, lineY).lineTo(line1X + lineLength, lineY).stroke();
      doc.moveTo(line2X, lineY).lineTo(line2X + lineLength, lineY).stroke();

      doc.moveDown(0.2);

      // Nomes das assinaturas
      doc.fontSize(8).font("Helvetica");
      doc.text("TRANSPORTES FRAMENTO LTDA", line1X, doc.y, {
        width: lineLength,
        align: "center",
      });

      doc.text(data.conductorName.toUpperCase(), line2X, doc.y - 12, {
        width: lineLength,
        align: "center",
      });

      // Finalizar o documento
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
