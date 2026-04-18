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
}

/**
 * Helper para converter DD/MM/YYYY para Date
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

/**
 * Gera PDF com suporte a múltiplas páginas, tipo correto, endereço e datas
 */
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
  const maxContentHeight = pageHeight - 60; // Espaço para rodapé

  let yPosition = margin;
  let currentPage = 1;

  /**
   * Função auxiliar para adicionar nova página
   */
  const addNewPage = () => {
    doc.addPage();
    currentPage++;
    yPosition = margin;
  };

  /**
   * Função auxiliar para verificar se precisa de nova página
   */
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > maxContentHeight) {
      addNewPage();
    }
  };

  /**
   * Função auxiliar para adicionar rodapé
   */
  const addFooter = () => {
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Este documento foi gerado automaticamente pelo sistema de gestão de motoristas.",
      margin,
      footerY
    );
    doc.text(
      `Data de emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      margin,
      footerY + 4
    );
    doc.text(`Página ${currentPage}`, pageWidth - margin - 20, footerY);
  };

  // ===== CABEÇALHO =====
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "bold");

  // Título dinâmico baseado no tipo
  const titleText =
    safeData.warningType === "suspensao"
      ? "SUSPENSÃO DISCIPLINAR"
      : "ADVERTÊNCIA DISCIPLINAR";
  doc.text(titleText, margin, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined as any, "normal");

  // Endereço oficial da Framento em Chapecó/SC
  doc.text("Framento Transportes", margin, yPosition);
  yPosition += 5;
  doc.text("Endereço: Rua Getúlio Vargas, 1000 - Chapecó/SC - CEP 89800-000", margin, yPosition);
  yPosition += 5;
  doc.text(`CNPJ: 00.000.000/0000-00 | Ano: ${new Date().getFullYear()}`, margin, yPosition);

  yPosition += 8;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  // ===== DADOS DO MOTORISTA =====
  checkPageBreak(20);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "bold");
  doc.text("DADOS DO MOTORISTA", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  const motoristInfo = [
    [`Nome: ${data.conductorName}`, `Placa: ${data.licensePlate}`],
    [
      `Operação: ${data.operacao}`,
      `Data: ${new Date(safeData.createdDate || Date.now()).toLocaleDateString("pt-BR")}`,
    ],
  ];

  motoristInfo.forEach((row) => {
    checkPageBreak(8);
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], margin + contentWidth / 2, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // ===== DETALHES DA MEDIDA =====
  checkPageBreak(20);

  doc.setFont(undefined as any, "bold");
  doc.setFontSize(11);
  doc.text("DETALHES DA MEDIDA DISCIPLINAR", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  // Tipo da medida
  checkPageBreak(8);
  doc.text(`Tipo: ${titleText}`, margin, yPosition);
  yPosition += 6;

  // Nível (apenas para advertência)
  if (safeData.warningType === "advertencia") {
    checkPageBreak(8);
    const levelLabel =
      safeData.warningLevel === "1"
        ? "Aviso 1"
        : safeData.warningLevel === "2"
          ? "Aviso 2"
          : "Aviso 3 (Crítico)";
    doc.text(`Nível: ${levelLabel}`, margin, yPosition);
    yPosition += 6;
  }

  // Dias de infração
  if (safeData.infrationDays) {
    checkPageBreak(8);
    doc.text(`Dias de Infração: ${safeData.infrationDays}`, margin, yPosition);
    yPosition += 6;
  }

  // ===== DATAS DE SUSPENSÃO (se aplicável) =====
  if (safeData.warningType === "suspensao") {
    yPosition += 5;
    checkPageBreak(30);

    doc.setFont(undefined as any, "bold");
    doc.setFontSize(11);
    doc.text("PERÍODO DE SUSPENSÃO", margin, yPosition);

    yPosition += 7;
    doc.setFont(undefined as any, "normal");
    doc.setFontSize(10);

    // Data de Início
    if (data.dataInicio) {
      checkPageBreak(8);
      const dataInicioFormatted = data.dataInicio; // Já está em DD/MM/YYYY
      doc.text(`Início da Suspensão: ${dataInicioFormatted}`, margin, yPosition);
      yPosition += 6;
    }

    // Data de Fim
    if (data.dataFim) {
      checkPageBreak(8);
      const dataFimFormatted = data.dataFim; // Já está em DD/MM/YYYY
      doc.text(`Fim da Suspensão: ${dataFimFormatted}`, margin, yPosition);
      yPosition += 6;
    }

    // Data de Retorno
    if (data.dataRetorno) {
      checkPageBreak(8);
      const dataRetornoFormatted = data.dataRetorno; // Já está em DD/MM/YYYY
      doc.text(`Retorno do Colaborador: ${dataRetornoFormatted}`, margin, yPosition);
      yPosition += 6;
    }
  }

  yPosition += 5;

  // ===== MOTIVO =====
  checkPageBreak(20);

  doc.setFont(undefined as any, "bold");
  doc.setFontSize(11);
  doc.text("MOTIVO", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  // Quebrar texto do motivo e verificar páginas
  const splitReason = doc.splitTextToSize(safeData.warningReason, contentWidth);
  const reasonHeight = splitReason.length * 5;

  checkPageBreak(reasonHeight + 10);
  doc.text(splitReason, margin, yPosition);
  yPosition += reasonHeight + 5;

  // ===== OBSERVAÇÃO =====
  if (safeData.warningNote) {
    checkPageBreak(20);

    doc.setFont(undefined as any, "bold");
    doc.setFontSize(11);
    doc.text("OBSERVAÇÃO", margin, yPosition);

    yPosition += 7;
    doc.setFont(undefined as any, "normal");
    doc.setFontSize(10);

    const splitNote = doc.splitTextToSize(safeData.warningNote, contentWidth);
    const noteHeight = splitNote.length * 5;

    checkPageBreak(noteHeight + 10);
    doc.text(splitNote, margin, yPosition);
    yPosition += noteHeight + 5;
  }

  // ===== RODAPÉ EM TODAS AS PÁGINAS =====
  // Adicionar rodapé na página atual
  addFooter();

  // Salvar PDF
  const fileName = `${titleText.replace(/\s+/g, "_")}_${data.conductorName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`;
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
