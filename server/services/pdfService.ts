import PDFDocument from "pdfkit";

export interface WarningPDFData {
  type: "advertencia" | "suspensao";
  employeeName: string;
  employeeCPF: string;
  employeeCTPS: string;
  licensePlate: string;
  operation: string;
  infringementDate: string;
  reason: string;
  description: string;
  penaltyType: string;
  penaltyDuration: string;
  startDate: string;
  endDate: string;
  returnDate: string;
  companyName?: string;
  companyAddress?: string;
  companyCNPJ?: string;
  companyCity?: string;
  signatureDate: string;
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
        data.type === "suspensao"
          ? "Suspensão Disciplinar"
          : "Advertência Disciplinar";

      doc.fontSize(14).font("Helvetica-Bold").text(titleText, { align: "center" });
      doc.moveDown(0.3);

      // ===== DADOS DA EMPRESA =====
      doc.fontSize(9).font("Helvetica-Bold").text("Empresa:", 40, doc.y);
      doc.font("Helvetica").fontSize(9);
      doc.text(data.companyName || "TRANSPORTES FRAMENTO LTDA", 100, doc.y - 12);
      doc.text(data.companyAddress || "Contorno da Petrobras, 107", 100, doc.y);
      doc.text("32.669-500 - " + (data.companyCity || "CHAPECÓ"), 100, doc.y);

      // MG alinhado à direita
      doc.fontSize(9).font("Helvetica-Bold");
      const mgY = doc.y - 36;
      doc.text("MG", 450, mgY, { align: "right" });

      doc.moveDown(0.2);

      // CNPJ
      doc.fontSize(9).font("Helvetica-Bold").text("CNPJ:", 40, doc.y);
      doc.font("Helvetica").text(data.companyCNPJ || "00.766.315/0009-00", 100, doc.y - 12);

      doc.moveDown(0.3);

      // ===== DADOS DO EMPREGADO =====
      doc.fontSize(9).font("Helvetica-Bold").text("Empregado:", 40, doc.y);
      doc.font("Helvetica").text(data.employeeName.toUpperCase(), 100, doc.y - 12);

      doc.moveDown(0.2);

      // CPF e CTPS na mesma linha
      const cpfCtpsY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold").text("CPF:", 40, cpfCtpsY);
      doc.font("Helvetica").text(data.employeeCPF, 100, cpfCtpsY);

      doc.fontSize(9).font("Helvetica-Bold").text("CTPS:", 300, cpfCtpsY);
      doc.font("Helvetica").text(data.employeeCTPS, 350, cpfCtpsY);

      doc.moveDown(0.4);

      // ===== PARÁGRAFO INTRODUTÓRIO =====
      const introText = `Tem esta a finalidade de aplicar-lhe a pena de ${
        data.type === "suspensao" ? "suspensão" : "advertência"
      } disciplinar, em razão da(s) seguinte(s) ocorrência(a):`;

      doc.fontSize(9).font("Helvetica");
      doc.text(introText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.15);

      // ===== DESCRIÇÃO DO MOTIVO =====
      doc.text(data.description, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.15);

      // ===== MOTIVO ESPECÍFICO =====
      if (data.reason) {
        doc.text(data.reason, {
          align: "justify",
          width: 520,
        });
        doc.moveDown(0.15);
      }

      // ===== PARÁGRAFO DE PENALIDADE =====
      const penaltyText = `Considerando o princípio da imediatidade na aplicação da medida disciplinar, a empresa delibera pela aplicação da ${
        data.type === "suspensao" ? "suspensão" : "advertência"
      } disciplinar pelo período acima mencionado.`;

      doc.text(penaltyText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.15);

      // ===== PERÍODO DE SUSPENSÃO/ADVERTÊNCIA =====
      const periodText = `Dessa forma, comunicamos a aplicação de ${
        data.type === "suspensao" ? "suspensão" : "advertência"
      } disciplinar, sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e empresa, com fundamento no Art. 482 da CLT, com início em ${data.startDate} e retorno às atividades em ${data.returnDate}.`;

      doc.text(periodText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.15);

      // ===== PARÁGRAFO FINAL =====
      const finalText = `Solicitamos que Vossa Senhoria assine o recebimento desta comunicação. Em caso de recusa, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da penalidade.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;

      doc.text(finalText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.25);

      // ===== LOCAL E DATA =====
      doc.fontSize(9).font("Helvetica");
      doc.text("Favor dar ciente na cópia desta.", 40, doc.y);
      doc.moveDown(0.15);
      doc.text(`${data.companyCity || "CHAPECÓ"}, ${data.signatureDate}.`, 40, doc.y);

      doc.moveDown(0.4);

      // ===== LINHAS DE ASSINATURA =====
      const lineY = doc.y;
      const lineLength = 120;
      const line1X = 40;
      const line2X = 320;

      doc.strokeColor("#000000").lineWidth(0.5);
      doc.moveTo(line1X, lineY).lineTo(line1X + lineLength, lineY).stroke();
      doc.moveTo(line2X, lineY).lineTo(line2X + lineLength, lineY).stroke();

      doc.moveDown(0.15);

      // Nomes das assinaturas
      doc.fontSize(8).font("Helvetica");
      doc.text("TRANSPORTES FRAMENTO LTDA", line1X, doc.y, {
        width: lineLength,
        align: "center",
      });

      doc.text(data.employeeName.toUpperCase(), line2X, doc.y - 12, {
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
