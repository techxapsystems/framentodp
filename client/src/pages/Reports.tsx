import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [filterType, setFilterType] = useState<"" | "motorista" | "operacao">("");
  const [selectedMotorista, setSelectedMotorista] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<"" | "pouco_rodado" | "horas_extras">("");

  // Query para buscar dados do relatório
  const { data: reportData, isLoading } = trpc.dashboard.getWarningsReport.useQuery(
    {
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      conductorName: selectedMotorista || undefined,
      tipo: selectedTipo || undefined,
    },
    {
      enabled: true,
      staleTime: 0,
    }
  );

  // Query para buscar lista de motoristas
  const { data: idleDriversData } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    {},
    { enabled: true, staleTime: 0 }
  );

  const generatePDF = async () => {
    if (!reportData?.warnings || reportData.warnings.length === 0) {
      toast.error("Nenhum dado para gerar relatório");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const { autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Título
      doc.setFontSize(16);
      doc.text("Relatório de Advertências", pageWidth / 2, 15, { align: "center" });

      // Filtros aplicados
      doc.setFontSize(10);
      let filterText = "Filtros: ";
      if (dateStart) filterText += `De ${dateStart} `;
      if (dateEnd) filterText += `até ${dateEnd} `;
      if (selectedMotorista) filterText += `Motorista: ${selectedMotorista} `;
      if (selectedTipo) filterText += `Tipo: ${selectedTipo === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"} `;

      doc.text(filterText, 10, 25);

      // Tabela
      const tableData = reportData.warnings.map((w: any) => [
        w.conductorName,
        w.tipo === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras",
        `Aviso ${w.nivelAdvertencia}`,
        new Date(w.criadoEm).toLocaleDateString("pt-BR"),
        w.motivo.substring(0, 30) + (w.motivo.length > 30 ? "..." : ""),
      ]);

      autoTable(doc, {
        head: [["Motorista", "Tipo", "Nível", "Data", "Motivo"]],
        body: tableData,
        startY: 35,
        margin: { top: 35 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [0, 31, 63],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
      });

      // Rodapé
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(8);
      doc.text(
        `Total de advertências: ${reportData.warnings.length}`,
        10,
        finalY + 10
      );
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
        10,
        finalY + 15
      );

      // Salvar PDF
      doc.save(`relatorio-advertencias-${new Date().getTime()}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Verifique o console.");
    }
  };

  const getWarningBadgeColor = (nivel: number) => {
    switch (nivel) {
      case 1:
        return "bg-yellow-100 text-yellow-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      case 3:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Relatórios de Advertências</h1>
        <p className="text-slate-600 mt-2">
          Gere relatórios filtrados por período, motorista ou tipo de advertência
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Data Início:
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Data Fim:
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Motorista:
              </label>
              <Select value={selectedMotorista} onValueChange={(v) => setSelectedMotorista(v === "" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {idleDriversData?.drivers?.map((d: any) => (
                    <SelectItem key={d.conductorName} value={d.conductorName}>
                      {d.conductorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Tipo:
              </label>
              <Select value={selectedTipo} onValueChange={(v: any) => setSelectedTipo(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                  <SelectItem value="horas_extras">Horas Extras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generatePDF}
                disabled={!reportData?.warnings || reportData.warnings.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 gap-2"
              >
                <Download className="w-4 h-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados ({reportData?.warnings?.length || 0} advertências)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData?.warnings && reportData.warnings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.warnings.map((warning: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{warning.conductorName}</TableCell>
                      <TableCell>
                        {warning.tipo === "pouco_rodado" ? "Pouco Rodado" : "Horas Extras"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getWarningBadgeColor(warning.nivelAdvertencia)}>
                          Aviso {warning.nivelAdvertencia}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(warning.criadoEm).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {warning.motivo}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {warning.observacao || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600">Nenhuma advertência encontrada com os filtros selecionados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
