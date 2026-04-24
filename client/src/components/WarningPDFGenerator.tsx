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
    cpf: data.cpf || "XXX.XXX.XXX-XX",
    ctps: data.ctps || "XXXXXXX",
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const maxContentHeight = pageHeight - 60;

  let yPosition = margin;
  let currentPage = 1;

  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    yPosition = margin;
  };

  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > maxContentHeight) {
      addNewPage();
    }
  };

  // ===== TÍTULO =====
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "bold");

  const titleText =
    safeData.warningType === "suspensao"
      ? "Suspensão Disciplinar"
      : "Advertência Disciplinar";
  
  doc.text(titleText, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 12;

  // ===== DADOS DA EMPRESA =====
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "normal");

  // Empresa
  doc.text("Empresa: TRANSPORTES FRAMENTOLTDA", margin, yPosition);
  yPosition += 5;

  // Endereço (em duas colunas)
  doc.text("Contorno da Petrobras, 107", margin, yPosition);
  doc.text("MG", pageWidth - margin - 20, yPosition);
  yPosition += 5;

  // CEP e Cidade
  doc.text("32.669-500 - BETIM", margin, yPosition);
  yPosition += 5;

  // CNPJ
  doc.text("CNPJ: 00.766.315/0009-00", margin, yPosition);
  yPosition += 8;

  // ===== DADOS DO FUNCIONÁRIO =====
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  doc.text(`Empregado: ${data.conductorName}`, margin, yPosition);
  yPosition += 5;

  doc.text(`CPF: ${safeData.cpf}`, margin, yPosition);
  yPosition += 5;

  doc.text(`CTPS: ${safeData.ctps}`, margin, yPosition);
  yPosition += 10;

  // ===== MOTIVO DA MEDIDA =====
  checkPageBreak(20);

  const motivoIntro = `Tem esta a finalidade de aplicar-lhe a pena de ${
    safeData.warningType === "suspensao" ? "suspensão" : "advertência"
  } disciplinar, em razão da(s) seguinte(s) ocorrência(a):`;

  const motivoIntroLines = doc.splitTextToSize(motivoIntro, contentWidth);
  motivoIntroLines.forEach((line: string) => {
    checkPageBreak(5);
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 5;

  // ===== DESCRIÇÃO DO MOTIVO =====
  checkPageBreak(20);
  const descricaoLines = doc.splitTextToSize(safeData.warningReason, contentWidth);
  descricaoLines.forEach((line: string) => {
    checkPageBreak(5);
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 5;

  // ===== OBSERVAÇÃO (se existir) =====
  if (safeData.warningNote) {
    checkPageBreak(20);
    const obsLines = doc.splitTextToSize(safeData.warningNote, contentWidth);
    obsLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // ===== PERÍODO DE SUSPENSÃO (se for suspensão) =====
  if (safeData.warningType === "suspensao" && (data.dataInicio || data.dataFim || data.dataRetorno)) {
    checkPageBreak(25);
    doc.setFont(undefined as any, "bold");
    doc.text("PERÍODO DE SUSPENSÃO", margin, yPosition);
    yPosition += 7;

    doc.setFont(undefined as any, "normal");
    if (data.dataInicio) {
      doc.text(`Data de Início: ${data.dataInicio}`, margin, yPosition);
      yPosition += 5;
    }
    if (data.dataFim) {
      doc.text(`Data de Término: ${data.dataFim}`, margin, yPosition);
      yPosition += 5;
    }
    if (data.dataRetorno) {
      doc.text(`Data de Retorno: ${data.dataRetorno}`, margin, yPosition);
      yPosition += 5;
    }
    yPosition += 5;
  }

  // ===== PARÁGRAFO FINAL =====
  checkPageBreak(20);
  const finalText = `Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;

  const finalLines = doc.splitTextToSize(finalText, contentWidth);
  finalLines.forEach((line: string) => {
    checkPageBreak(5);
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  // ===== ASSINATURAS =====
  checkPageBreak(40);
  yPosition += 15;

  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  // Linha de assinatura empresa
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 5;
  doc.text("TRANSPORTES FRAMENTOLTDA", margin, yPosition);
  yPosition += 10;

  // Linha de assinatura funcionário
  doc.line(margin + 60, yPosition - 10, margin + 110, yPosition - 10);
  yPosition -= 5;
  doc.text(data.conductorName.toUpperCase(), margin + 60, yPosition);

  // ===== RODAPÉ =====
  doc.setFontSize(8);
  doc.setFont(undefined as any, "normal");
  doc.setTextColor(100, 100, 100);

  const dataFormatada = new Date(safeData.createdDate).toLocaleDateString("pt-BR");
  const footerText = `Favor dar ciente na cópia desta.`;
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

  // Data no rodapé
  doc.text(dataFormatada, pageWidth / 2, pageHeight - 10, { align: "center" });

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
