import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  dataInicio?: string;
  dataFim?: string;
  dataRetorno?: string;
  cpf?: string;
  ctps?: string;
}

export async function generateWarningPDF(data: WarningPDFProps) {
  try {
    const response = await fetch("/api/auth/download-warning-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warningId: `warning-${Date.now()}`,
        conductorName: data.conductorName,
        conductorCPF: data.cpf || "___.___.___-__",
        warningDate: data.createdDate
          ? new Date(data.createdDate).toLocaleDateString("pt-BR")
          : new Date().toLocaleDateString("pt-BR"),
        warningType: data.warningType,
        warningLevel: data.warningLevel,
        startDate: data.dataInicio || "",
        endDate: data.dataFim || "",
        returnDate: data.dataRetorno || "",
        reason: data.warningReason || "",
        description: data.warningNote || data.warningReason || "",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Erro HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const titleText =
      data.warningType === "suspensao"
        ? "Suspensão_Disciplinar"
        : "Advertência_Disciplinar";
    a.download = `${titleText}_${data.conductorName.replace(/\s+/g, "_")}.pdf`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    toast.error("Erro ao gerar PDF: " + (error instanceof Error ? error.message : String(error)));
  }
}

interface WarningPDFButtonProps extends WarningPDFProps {
  disabled?: boolean;
}

export function WarningPDFButton(props: WarningPDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await generateWarningPDF(props);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={handleClick}
      disabled={props.disabled || loading}
      title="Imprimir advertência em PDF"
      data-pdf-trigger
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {loading ? "Gerando..." : "Imprimir PDF"}
    </Button>
  );
}
