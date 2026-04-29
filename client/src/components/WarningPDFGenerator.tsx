import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface WarningPDFProps {
  conductorName: string;
  licensePlate: string;
  operacao: string;
  warningLevel: string;
  warningType: string; // "advertencia" ou "suspensao"
  warningReason: string;
  warningNote?: string;
  infrationDays?: string;
  createdDate?: Date;
  // Campos específicos para suspensão
  dataInicio?: string; // DD/MM/YYYY
  dataFim?: string; // DD/MM/YYYY
  dataRetorno?: string; // DD/MM/YYYY
  cpf?: string;
  ctps?: string;
}

export function generateWarningPDF(data: WarningPDFProps) {
  const safeData = {
    ...data,
    warningReason: data.warningReason || "",
    warningNote: data.warningNote || "",
    infrationDays: data.infrationDays || "",
    createdDate: data.createdDate || new Date(),
    cpf: data.cpf || "___.___.___-__",
    ctps: data.ctps || "_________    ____ - __",
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let yPosition = margin;

  // ===== TÍTULO =====
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "bold");

  const titleText =
    safeData.warningType === "suspensao"
      ? "Suspensão Disciplinar"
      : "Advertência Disciplinar";

  doc.text(titleText, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 6;

  // ===== DADOS DA EMPRESA (2 colunas) =====
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "normal");

  const col1X = margin;
  const col2X = pageWidth / 2;

  // Coluna 1: Empresa
  doc.setFont(undefined as any, "bold");
  doc.text("Empresa:", col1X, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text("TRANSPORTES FRAMENTO LTDA", col1X + 20, yPosition);
  yPosition += 4;

  doc.text("Contorno da Petrobras, 107", col1X + 20, yPosition);
  yPosition += 4;

  doc.text("32.669-500 - CHAPECÓ", col1X + 20, yPosition);

  // Coluna 2: Estado
  doc.setFont(undefined as any, "bold");
  doc.text("MG", col2X, yPosition);

  yPosition += 4;

  // CNPJ
  doc.setFont(undefined as any, "bold");
  doc.text("CNPJ:", col1X, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text("00.766.315/0009-00", col1X + 20, yPosition);

  yPosition += 6;

  // ===== DADOS DO EMPREGADO (2 colunas) =====
  doc.setFont(undefined as any, "bold");
  doc.text("Empregado:", col1X, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(data.conductorName.toUpperCase(), col1X + 25, yPosition);
  yPosition += 4;

  doc.setFont(undefined as any, "bold");
  doc.text("CPF:", col1X, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(safeData.cpf, col1X + 20, yPosition);

  doc.setFont(undefined as any, "bold");
  doc.text("CTPS:", col2X, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(safeData.ctps, col2X + 15, yPosition);

  yPosition += 5;

  // ===== PARÁGRAFO INTRODUTÓRIO =====
  doc.setFontSize(8.5);
  doc.setFont(undefined as any, "normal");

  const introText = `Tem esta a finalidade de aplicar-lhe a pena de ${
    safeData.warningType === "suspensao" ? "suspensão" : "advertência"
  } disciplinar, em razão da(s) seguinte(s) ocorrência(a):`;

  const introLines = doc.splitTextToSize(introText, contentWidth);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 3.5;
  });

  yPosition += 2;

  // ===== DESCRIÇÃO DO MOTIVO =====
  const descricaoLines = doc.splitTextToSize(safeData.warningReason, contentWidth);
  descricaoLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 3.5;
  });

  yPosition += 2;

  // ===== OBSERVAÇÃO (se existir) =====
  if (safeData.warningNote) {
    const obsLines = doc.splitTextToSize(safeData.warningNote, contentWidth);
    obsLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 3.5;
    });
    yPosition += 2;
  }

  // ===== PERÍODO DE SUSPENSÃO (se for suspensão) =====
  if (safeData.warningType === "suspensao" && (data.dataInicio || data.dataRetorno)) {
    const suspensionText = `Dessa forma, comunicamos a aplicação de suspensão disciplinar, sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e empresa, com fundamento no Art. 482 da CLT, com início em ${data.dataInicio} e retorno às atividades em ${data.dataRetorno}.`;

    const suspensionLines = doc.splitTextToSize(suspensionText, contentWidth);
    suspensionLines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 3.5;
    });
    yPosition += 2;
  }

  // ===== PARÁGRAFO FINAL =====
  const finalText = `Solicitamos que Vossa Senhoria assine o recebimento desta comunicação. Em caso de recusa, um representante da empresa e duas testemunhas assinarão para atestar o devido conhecimento da penalidade.

Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;

  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  finalLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += 3.5;
  });

  yPosition += 4;

  // ===== LOCAL E DATA =====
  doc.setFontSize(8.5);
  const dataFormatada = new Date(safeData.createdDate).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  doc.text("Favor dar ciente na cópia desta.", margin, yPosition);
  yPosition += 3;
  doc.text(`CHAPECÓ, ${dataFormatada}.`, margin, yPosition);

  yPosition += 6;

  // ===== LINHAS DE ASSINATURA =====
  const lineY = yPosition;
  const lineLength = 45;
  const line1X = margin;
  const line2X = margin + contentWidth - lineLength;

  doc.setLineWidth(0.3);
  doc.line(line1X, lineY, line1X + lineLength, lineY);
  doc.line(line2X, lineY, line2X + lineLength, lineY);

  yPosition += 3;

  // Nomes das assinaturas
  doc.setFontSize(8);
  doc.text("TRANSPORTES FRAMENTO LTDA", line1X, yPosition, { align: "center", maxWidth: lineLength });
  doc.text(data.conductorName.toUpperCase(), line2X, yPosition, { align: "center", maxWidth: lineLength });

  // ===== RODAPÉ =====
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const footerY = pageHeight - 6;

  const footerLine = `FPD0131.COL - ${dataFormatada.split(" ")[0]} - 14:42:41`;
  doc.text(footerLine, margin, footerY);
  doc.text("TRANSPORTES FRAMENTO LTDA", pageWidth / 2, footerY, { align: "center" });

  // Salvar PDF
  const fileName = `${titleText.replace(/\s+/g, "_")}_${data.conductorName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
}

interface WarningPDFButtonProps extends WarningPDFProps {
  disabled?: boolean;
}

export function WarningPDFButton(props: WarningPDFButtonProps) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={() => generateWarningPDF(props)}
      disabled={props.disabled}
      title="Imprimir advertência em PDF"
      data-pdf-trigger
    >
      <Download className="w-4 h-4" />
      Imprimir PDF
    </Button>
  );
}
