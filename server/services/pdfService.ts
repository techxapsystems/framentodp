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
  startDate: string; // DD/MM/YYYY or Date object
  endDate: string; // DD/MM/YYYY or Date object
  returnDate: string; // DD/MM/YYYY or Date object
  companyName?: string;
  companyAddress?: string;
  companyCNPJ?: string;
  companyCity?: string;
  signatureDate: string;
}

// Helper function to format date from ISO or DD/MM/YYYY to DD/MM/YYYY
function formatDateToBR(dateInput: string | Date): string {
  if (typeof dateInput === "string") {
    // If already in DD/MM/YYYY format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
      return dateInput;
    }
    // If ISO format, convert
    try {
      const date = new Date(dateInput);
      return date.toLocaleDateString("pt-BR");
    } catch {
      return dateInput;
    }
  }
  return dateInput.toLocaleDateString("pt-BR");
}

// Helper function to convert number to Portuguese text
function numberToPortuguese(num: number): string {
  const numbers: { [key: number]: string } = {
    1: "um",
    2: "dois",
    3: "três",
    4: "quatro",
    5: "cinco",
    6: "seis",
    7: "sete",
    8: "oito",
    9: "nove",
    10: "dez",
  };
  return numbers[num] || num.toString();
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

      doc.fontSize(12).font("Helvetica-Bold").text(titleText, { align: "center" });
      doc.moveDown(0.4);

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

      doc.moveDown(0.1);

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

      doc.moveDown(0.3);

      // ===== DESCRIÇÃO DO MOTIVO (Parágrafos separados) =====
      doc.text(data.description, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.3);

      // ===== MOTIVO ESPECÍFICO =====
      if (data.reason) {
        doc.text(data.reason, {
          align: "justify",
          width: 520,
        });
        doc.moveDown(0.3);
      }

      // ===== PERÍODO DE SUSPENSÃO/ADVERTÊNCIA =====
      const startDateFormatted = formatDateToBR(data.startDate);
      const endDateFormatted = formatDateToBR(data.endDate);
      const returnDateFormatted = formatDateToBR(data.returnDate);

      // Calculate days between start and end date
      let daysCount = 1;
      try {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } catch {
        daysCount = 1;
      }

      const daysText = numberToPortuguese(daysCount);

      const periodText = `Dessa forma, comunicamos a aplicação de ${
        data.type === "suspensao" ? "suspensão" : "advertência"
      } disciplinar de ${daysCount} (${daysText}) dia(s), sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e nas normas internas da empresa, com fundamento no Art. 482 da CLT, com início em ${startDateFormatted}, término em ${endDateFormatted} e retorno às atividades em ${returnDateFormatted}.`;

      doc.text(periodText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.3);

      // ===== PARÁGRAFO DE RECEBIMENTO =====
      const receiptText = `Solicitamos que Vossa Senhoria assine o recebimento desta comunicação. Em caso de recusa, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da penalidade.`;

      doc.text(receiptText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.3);

      // ===== PARÁGRAFO FINAL =====
      const finalText = `Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato falso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;

      doc.text(finalText, {
        align: "justify",
        width: 520,
      });

      doc.moveDown(0.4);

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
