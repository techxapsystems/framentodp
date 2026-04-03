import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// Cores Framento
const FRAMENTO_RED = [230, 57, 70]; // #E63946
const FRAMENTO_BLUE = [30, 58, 138]; // #1E3A8A
const FRAMENTO_DARK = [15, 23, 42]; // #0F172A

interface WarningPDFProps {
  conductorName: string;
  licensePlate: string;
  operacao: string;
  warningLevel: string;
  warningType: string;
  warningReason: string;
  warningNote?: string;
  infrationDays?: string;
  createdDate?: Date;
}

export function generateWarningPDF(data: WarningPDFProps) {
  // Ensure all required fields have values
  const safeData = {
    ...data,
    warningReason: data.warningReason || "",
    warningNote: data.warningNote || "",
    infrationDays: data.infrationDays || "",
    createdDate: data.createdDate || new Date(),
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

  let yPosition = margin;

  // Cabeçalho com fundo colorido Framento
  doc.setFillColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Logo/Título em branco sobre fundo azul
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined as any, "bold");
  doc.text("FRAMENTO TRANSPORTES", margin, 12);

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont(undefined as any, "normal");
  const docType = data.warningType === "pouco_rodado" ? "ADVERTÊNCIA" : "SUSPENSÃO";
  doc.text(docType, margin, 22);

  // Linha separadora vermelha
  doc.setDrawColor(FRAMENTO_RED[0], FRAMENTO_RED[1], FRAMENTO_RED[2]);
  doc.setLineWidth(2);
  doc.line(margin, 28, pageWidth - margin, 28);

  yPosition = 40;
  doc.setTextColor(FRAMENTO_DARK[0], FRAMENTO_DARK[1], FRAMENTO_DARK[2]);

  yPosition += 8;

  // Informações do motorista
  doc.setFontSize(11);
  doc.setFont(undefined as any, "bold");
  doc.setTextColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.text("DADOS DO MOTORISTA", margin, yPosition);

  // Linha separadora azul
  doc.setDrawColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 1, pageWidth - margin, yPosition + 1);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);
  doc.setTextColor(FRAMENTO_DARK[0], FRAMENTO_DARK[1], FRAMENTO_DARK[2]);

  const motoristInfo = [
    [`Nome: ${data.conductorName}`, `Placa: ${data.licensePlate}`],
    [`Operação: ${data.operacao}`, `Data: ${new Date(data.createdDate || Date.now()).toLocaleDateString("pt-BR")}`],
  ];

  motoristInfo.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], margin + contentWidth / 2, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Informações da advertência
  doc.setFont(undefined as any, "bold");
  doc.setFontSize(11);
  doc.setTextColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.text("DETALHES DA ADVERTÊNCIA", margin, yPosition);

  // Linha separadora azul
  doc.setDrawColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 1, pageWidth - margin, yPosition + 1);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);
  doc.setTextColor(FRAMENTO_DARK[0], FRAMENTO_DARK[1], FRAMENTO_DARK[2]);

  const warningInfo = [
    [`Tipo: ${data.warningType === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"}`],
    [`Nível: ${data.warningLevel === "1" ? "Aviso 1" : data.warningLevel === "2" ? "Aviso 2" : "Aviso 3 (Crítico)"}`],
  ];

  warningInfo.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    yPosition += 6;
  });

  if (data.infrationDays) {
    doc.text(`Dias de Infração: ${data.infrationDays}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  // Motivo
  doc.setFont(undefined as any, "bold");
  doc.setFontSize(11);
  doc.setTextColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.text("MOTIVO", margin, yPosition);

  // Linha separadora azul
  doc.setDrawColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 1, pageWidth - margin, yPosition + 1);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);
  doc.setTextColor(FRAMENTO_DARK[0], FRAMENTO_DARK[1], FRAMENTO_DARK[2]);

  const splitReason = doc.splitTextToSize(data.warningReason, contentWidth);
  doc.text(splitReason, margin, yPosition);
  yPosition += splitReason.length * 5 + 5;

  // Observação
  if (data.warningNote) {
    doc.setFont(undefined as any, "bold");
    doc.setFontSize(11);
    doc.setTextColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
    doc.text("OBSERVAÇÃO", margin, yPosition);

    // Linha separadora azul
    doc.setDrawColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition + 1, pageWidth - margin, yPosition + 1);

    yPosition += 7;
    doc.setFont(undefined as any, "normal");
    doc.setFontSize(10);
    doc.setTextColor(FRAMENTO_DARK[0], FRAMENTO_DARK[1], FRAMENTO_DARK[2]);

    const splitNote = doc.splitTextToSize(data.warningNote, contentWidth);
    doc.text(splitNote, margin, yPosition);
    yPosition += splitNote.length * 5 + 5;
  }

  // Rodapé com fundo
  doc.setFillColor(FRAMENTO_BLUE[0], FRAMENTO_BLUE[1], FRAMENTO_BLUE[2]);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("TRANSPORTES FRAMENTO LTDA | CNPJ: 00.766.315/0001-44", margin, pageHeight - 12);
  doc.text(`Emissão: ${new Date().toLocaleDateString("pt-BR")} | Sistema de Gestão de Motoristas`, margin, pageHeight - 7);

  // Salvar PDF
  const fileName = `${docType}_${data.conductorName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`;
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
