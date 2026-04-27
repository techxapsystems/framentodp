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
  doc.setFontSize(16);
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
  doc.setFont(undefined as any, "bold");
  doc.text("Empresa:", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text("TRANSPORTES FRAMENTO LTDA", margin + 30, yPosition);
  yPosition += 5;

  // Endereço linha 1
  doc.setFont(undefined as any, "bold");
  doc.text("", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text("Rua Borges de Medeiros, 897-E, Sala 1201", margin + 30, yPosition);
  yPosition += 5;

  // Endereço linha 2
  doc.text("Presidente Médici", margin + 30, yPosition);
  yPosition += 5;

  // Endereço linha 3 com estado
  doc.text("89.801-161 - CHAPECÓ", margin + 30, yPosition);
  doc.text("SC", pageWidth - margin - 15, yPosition);
  yPosition += 5;

  // CNPJ
  doc.setFont(undefined as any, "bold");
  doc.text("CNPJ:", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text("00.766.315/0001-44", margin + 30, yPosition);
  yPosition += 8;

  // ===== DADOS DO FUNCIONÁRIO =====
  doc.setFont(undefined as any, "bold");
  doc.text("Empregado:", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(data.conductorName.toUpperCase(), margin + 30, yPosition);
  yPosition += 5;

  doc.setFont(undefined as any, "bold");
  doc.text("CPF:", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(safeData.cpf, margin + 30, yPosition);
  yPosition += 5;

  doc.setFont(undefined as any, "bold");
  doc.text("CTPS:", margin, yPosition);
  doc.setFont(undefined as any, "normal");
  doc.text(safeData.ctps, margin + 30, yPosition);
  yPosition += 10;

  // ===== MOTIVO DA MEDIDA =====
  checkPageBreak(20);
  doc.setFont(undefined as any, "normal");

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
    
    // Parágrafo sobre suspensão
    const suspensionText = `Dessa forma, comunicamos a aplicação de suspensão disciplinar de 02 (dois) dias, sem remuneração dos dias e do respectivo DSR, conforme previsto na legislação trabalhista e empresa, com fundamento no Art. 482, alíneas "b" (mau procedimento) e "j" (ato lesivo da honra ou da boa fama praticado no serviço), da CLT, com início em ${data.dataInicio}, término em ${data.dataFim} e retorno às atividades em ${data.dataRetorno}.`;
    
    const suspensionLines = doc.splitTextToSize(suspensionText, contentWidth);
    suspensionLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
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

  // "Favor dar ciente na cópia desta."
  doc.text("Favor dar ciente na cópia desta.", margin, yPosition);
  yPosition += 8;

  // Local e data
  const dataFormatada = new Date(safeData.createdDate).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`CHAPECÓ, ${dataFormatada}.`, margin, yPosition);
  yPosition += 15;

  // Linhas de assinatura
  doc.line(margin, yPosition, margin + 50, yPosition);
  doc.line(margin + contentWidth - 50, yPosition, margin + contentWidth, yPosition);
  yPosition += 5;

  // Nomes das assinaturas
  doc.setFontSize(9);
  doc.text("TRANSPORTES FRAMENTO LTDA", margin + 5, yPosition);
  doc.text(data.conductorName.toUpperCase(), margin + contentWidth - 45, yPosition);

  // ===== RODAPÉ =====
  doc.setFontSize(8);
  doc.setFont(undefined as any, "normal");
  doc.setTextColor(80, 80, 80);
  
  const footerLine = `FPD0131.COL - ${dataFormatada.split(" ")[0]} - 16:38:16                    TRANSPORTES FRAMENTO LTDA`;
  doc.text(footerLine, pageWidth / 2, pageHeight - 10, { align: "center" });

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
