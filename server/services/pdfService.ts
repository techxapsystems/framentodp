import PDFDocument from "pdfkit";

export interface WarningPDFData {
  type: "advertencia" | "suspensao";
  employeeName: string;
  employeeCPF: string;
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

function formatDateBR(dateInput: string | Date): string {
  if (!dateInput) return "";
  const str = typeof dateInput === "string" ? dateInput : dateInput.toISOString();
  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  // ISO format
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return str;
  }
}

function numPorExtenso(n: number): string {
  const map: Record<number, string> = {
    1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco",
    6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
    15: "quinze", 30: "trinta",
  };
  return map[n] || String(n);
}

function calcDays(start: string, end: string): number {
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    return Math.round(Math.abs(e.getTime() - s.getTime()) / 86400000) + 1;
  } catch {
    return 1;
  }
}

export async function generateWarningPDF(data: WarningPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Page setup: A4 with 50pt margins (matching reference)
      const LEFT = 50;
      const RIGHT = 50;
      const PAGE_W = 595.28;
      const CONTENT_W = PAGE_W - LEFT - RIGHT; // ~495pt

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 40, left: LEFT, right: RIGHT },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const FONT_NORMAL = "Helvetica";
      const FONT_BOLD = "Helvetica-Bold";
      const BODY_SIZE = 9;
      const TITLE_SIZE = 13;
      const LABEL_X = LEFT;
      const VALUE_X = LEFT + 70; // 120pt from left edge for values

      // ============================================================
      // TÍTULO
      // ============================================================
      const title = data.type === "suspensao"
        ? "Suspensão Disciplinar"
        : "Advertência Disciplinar";

      doc.font(FONT_BOLD).fontSize(TITLE_SIZE);
      doc.text(title, LEFT, doc.y, { width: CONTENT_W, align: "center" });
      doc.moveDown(0.8);

      // ============================================================
      // DADOS DA EMPRESA
      // ============================================================
      const companyName = data.companyName || "TRANSPORTES FRAMENTO LTDA";
      const companyAddress = data.companyAddress || "Ed. Vértice Office - R. Borges de Medeiros, 897 - E - sala 1201";
      const companyCNPJ = data.companyCNPJ || "00.766.315/0009-00";
      const companyCity = data.companyCity || "Chapecó";
      const companyState = "SC";
      const companyZip = "89801-161";

      // Empresa: label + value
      let y = doc.y;
      doc.font(FONT_BOLD).fontSize(BODY_SIZE);
      doc.text("Empresa:", LABEL_X, y);
      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(companyName, VALUE_X, y);

      // Address line
      y = doc.y;
      doc.text(companyAddress, VALUE_X, y);

      // City + State + Zip
      y = doc.y;
      doc.text(`${companyZip} - ${companyCity}`, VALUE_X, y);
      // State on same line, right-aligned
      doc.text(companyState, PAGE_W - RIGHT - 30, y);

      // CNPJ
      y = doc.y;
      doc.font(FONT_BOLD).fontSize(BODY_SIZE);
      doc.text("CNPJ:", LABEL_X, y);
      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(companyCNPJ, VALUE_X, y);

      doc.moveDown(0.5);

      // ============================================================
      // DADOS DO EMPREGADO
      // ============================================================
      y = doc.y;
      doc.font(FONT_BOLD).fontSize(BODY_SIZE);
      doc.text("Empregado:", LABEL_X, y);
      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(data.employeeName.toUpperCase(), VALUE_X, y);

      // CPF
      y = doc.y;
      doc.font(FONT_BOLD).fontSize(BODY_SIZE);
      doc.text("CPF:", LABEL_X, y);
      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(data.employeeCPF, VALUE_X, y);

      doc.moveDown(0.5);

      // ============================================================
      // PARÁGRAFO INTRODUTÓRIO
      // ============================================================
      const tipoTexto = data.type === "suspensao" ? "suspensão" : "advertência";
      const introText = `Tem esta a finalidade de aplicar-lhe a pena de ${tipoTexto} disciplinar, em razão da(s) seguinte(s) ocorrência(a):`;

      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(introText, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
      doc.moveDown(1.2);

      // ============================================================
      // DESCRIÇÃO (texto principal do motivo)
      // ============================================================
      if (data.description) {
        doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
        doc.text(data.description, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
        doc.moveDown(1.2);
      }

      // ============================================================
      // MOTIVO ESPECÍFICO
      // ============================================================
      if (data.reason && data.reason !== data.description) {
        doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
        doc.text(data.reason, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
        doc.moveDown(1.2);
      }

      // ============================================================
      // PERÍODO DE SUSPENSÃO (somente para suspensão)
      // ============================================================
      if (data.type === "suspensao") {
        const startF = formatDateBR(data.startDate);
        const endF = formatDateBR(data.endDate);
        const returnF = formatDateBR(data.returnDate);
        const days = calcDays(data.startDate, data.endDate);
        const daysExt = numPorExtenso(days);

        const suspText = `Dessa forma, comunicamos a aplicação de suspensão disciplinar de ${String(days).padStart(2, "0")} (${daysExt}) dia(s), sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e nas normas internas da empresa, com início em ${startF}, término em ${endF} e retorno às atividades em ${returnF}.`;

        doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
        doc.text(suspText, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
        doc.moveDown(1.2);
      }

      // ============================================================
      // PARÁGRAFO DE RECEBIMENTO
      // ============================================================
      const receiptText = "Solicitamos que Vossa Senhoria assine o recebimento desta comunicação. Em caso de recusa, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da penalidade.";

      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(receiptText, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
      doc.moveDown(1.2);

      // ============================================================
      // PARÁGRAFO FINAL (ESCLARECIMENTO)
      // ============================================================
      const finalText = "Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.";

      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text(finalText, LEFT, doc.y, { width: CONTENT_W, align: "justify" });
      doc.moveDown(1.5);

      // ============================================================
      // LOCAL E DATA (alinhado à direita, como no modelo)
      // ============================================================
      doc.font(FONT_NORMAL).fontSize(BODY_SIZE);
      doc.text("Favor dar ciente na cópia desta.", LEFT, doc.y, { width: CONTENT_W, align: "right" });
      const displayDate = data.type === "suspensao" ? formatDateBR(data.startDate) : data.signatureDate;
      doc.text(`${companyCity}, ${displayDate}.`, LEFT, doc.y, { width: CONTENT_W, align: "right" });
      doc.moveDown(2.5);

      // ============================================================
      // LINHAS DE ASSINATURA
      // ============================================================
      const sigY = doc.y;
      const sigLineLen = 180;
      const sig1X = LEFT;
      const sig2X = PAGE_W - RIGHT - sigLineLen;

      doc.strokeColor("#000000").lineWidth(0.5);
      doc.moveTo(sig1X, sigY).lineTo(sig1X + sigLineLen, sigY).stroke();
      doc.moveTo(sig2X, sigY).lineTo(sig2X + sigLineLen, sigY).stroke();

      // Nomes abaixo das linhas
      doc.font(FONT_NORMAL).fontSize(8);
      doc.text("TRANSPORTES FRAMENTO", sig1X, sigY + 4, { width: sigLineLen, align: "center" });
      doc.text("LTDA", sig1X, doc.y, { width: sigLineLen, align: "center" });

      doc.font(FONT_NORMAL).fontSize(8);
      doc.text(data.employeeName.toUpperCase(), sig2X, sigY + 4, { width: sigLineLen, align: "center" });

      // Finalizar
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
