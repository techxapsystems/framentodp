import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  warningId?: number;
}

export function generateWarningPDFBlob(data: WarningPDFProps): Blob {
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

  // Cabeçalho com logo/título
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("ADVERTÊNCIA", margin, yPosition);

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Framento Transportes - ${new Date().getFullYear()}`, margin, yPosition);

  // Linha separadora
  yPosition += 8;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  // Informações do motorista
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "bold");
  doc.text("DADOS DO MOTORISTA", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  const motoristInfo = [
    [`Nome: ${data.conductorName}`, `Placa: ${data.licensePlate}`],
    [`Operação: ${data.operacao}`, `Data: ${new Date(safeData.createdDate || Date.now()).toLocaleDateString("pt-BR")}`],
  ];

  motoristInfo.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], margin + contentWidth / 2, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Informações da advertência    doc.setFont(undefined as any, "normal");doc.setFontSize(11);
  doc.text("DETALHES DA ADVERTÊNCIA", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  const warningInfo = [
    [`Tipo: ${data.warningType === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"}`],
    [`Nível: ${data.warningLevel === "1" ? "Aviso 1" : data.warningLevel === "2" ? "Aviso 2" : "Aviso 3 (Crítico)"}`],
  ];

  warningInfo.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    yPosition += 6;
  });

  if (safeData.infrationDays) {
    doc.text(`Dias de Infração: ${safeData.infrationDays}`, margin, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  // Motivo
  doc.setFont(undefined as any, "bold");
  doc.setFontSize(11);
  doc.text("MOTIVO", margin, yPosition);

  yPosition += 7;
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(10);

  const splitReason = doc.splitTextToSize(safeData.warningReason, contentWidth);
  doc.text(splitReason, margin, yPosition);
   yPosition += splitReason.length * 5 + 5;
  // Observação
  if (safeData.warningNote) {
    doc.setFont(undefined as any, "bold");
    doc.setFontSize(11);
    doc.text("OBSERVAÇÃO", margin, yPosition);
    yPosition += 7;
    doc.setFont(undefined as any, "normal");
    doc.setFontSize(10);
    const splitNote = doc.splitTextToSize(safeData.warningNote, contentWidth);
    doc.text(splitNote, margin, yPosition);
    yPosition += splitNote.length * 5 + 5;
  }

  // Rodapé
  yPosition = pageHeight - 30;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Este documento foi gerado automaticamente pelo sistema de gestão de motoristas.", margin, yPosition);
  doc.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, margin, yPosition + 5);

  return doc.output("blob") as Blob;
}

interface WarningPDFWithHistoryButtonProps extends WarningPDFProps {
  disabled?: boolean;
  onSaved?: () => void;
}

export function WarningPDFWithHistoryButton(props: WarningPDFWithHistoryButtonProps) {
  const savePdfMutation = trpc.dashboard.savePdfHistory.useMutation({
    onSuccess: () => {
      toast.success("PDF salvo no histórico com sucesso!");
      props.onSaved?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar PDF: ${error.message}`);
    },
  });

  const handleSaveToHistory = async () => {
    try {
      // Gerar blob do PDF
      const pdfBlob = generateWarningPDFBlob(props);
      
      // Converter blob para base64 para envio
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        
        savePdfMutation.mutate({
          warningId: props.warningId || 0,
          pdfBase64: base64,
          fileName: `warning-${props.warningId}-${new Date().getTime()}.pdf`,
        });
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      toast.error("Erro ao processar PDF");
      console.error(error);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={handleSaveToHistory}
      disabled={props.disabled || savePdfMutation.isPending}
      title="Salvar PDF no histórico de auditoria"
    >
      <Save className="w-4 h-4" />
      {savePdfMutation.isPending ? "Salvando..." : "Salvar no Histórico"}
    </Button>
  );
}
