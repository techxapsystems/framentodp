import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateMaskInput } from "@/components/DateMaskInput";
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
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Reports() {
  const [dateStartDisplay, setDateStartDisplay] = useState("");
  const [dateEndDisplay, setDateEndDisplay] = useState("");
  const [selectedMotorista, setSelectedMotorista] = useState("");
  const [motoristaBusca, setMotoristaBusca] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<"" | "pouco_rodado" | "horas_extras">("");
  const [selectedOperacao, setSelectedOperacao] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"" | "aplicadas" | "todas">("");

  // Converter DD/MM/YYYY para YYYY-MM-DD para query
  const dateStart = dateStartDisplay.length === 10 && dateStartDisplay.includes("/")
    ? (() => {
        const [day, month, year] = dateStartDisplay.split("/");
        return `${year}-${month}-${day}`;
      })()
    : "";

  const dateEnd = dateEndDisplay.length === 10 && dateEndDisplay.includes("/")
    ? (() => {
        const [day, month, year] = dateEndDisplay.split("/");
        return `${year}-${month}-${day}`;
      })()
    : "";

  // Query para buscar lista de motoristas (DEVE VIR PRIMEIRO)
  const { data: queryResult } = trpc.dashboard.getIdleDriversForWarning.useQuery(
    {},
    { enabled: true, staleTime: 0 }
  );
  const idleDriversData = Array.isArray(queryResult) ? queryResult : (queryResult as any)?.json || [];

  // Query para buscar dados do relatório
  const { data: reportData, isLoading } = trpc.dashboard.getWarningsReport.useQuery(
    {
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      conductorName: selectedMotorista || undefined,
      tipo: selectedTipo || undefined,
      operacao: selectedOperacao || undefined,
    },
    {
      enabled: true,
      staleTime: 0,
    }
  );

  // Filtrar motoristas baseado na busca
  const motoristasFiltrados = useMemo(() => {
    if (!Array.isArray(idleDriversData)) return [];
    return idleDriversData.filter((d: any) =>
      d.conductorName.toLowerCase().includes(motoristaBusca.toLowerCase())
    );
  }, [idleDriversData, motoristaBusca]);

  const generatePDF = async () => {
    const warnings = Array.isArray(reportData) ? reportData : reportData?.warnings || [];
    if (!warnings || warnings.length === 0) {
      toast.error("Nenhum dado para gerar relatório");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Relatório de Advertências", 10, 10);
      doc.setFontSize(10);
      doc.text(
        `Período: ${dateStartDisplay || "Início"} a ${dateEndDisplay || "Fim"}`,
        10,
        20
      );

      const tableData = warnings.map((w: any) => [
        w.conductorName || "",
        w.operacao || "",
        w.placa || "",
        w.data ? new Date(w.data).toLocaleDateString("pt-BR") : "",
        w.tipo || "",
        w.assinada ? "Sim" : "Não",
      ]);

      (doc as any).autoTable({
        head: [["Motorista", "Operação", "Placa", "Data", "Tipo", "Assinada"]],
        body: tableData,
        startY: 30,
        margin: { top: 30 },
      });

      // Rodapé
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(8);
      doc.text(
        `Total de advertências: ${warnings.length}`,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Data Início:
              </label>
              <DateMaskInput
                value={dateStartDisplay}
                onChange={setDateStartDisplay}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Data Fim:
              </label>
              <DateMaskInput
                value={dateEndDisplay}
                onChange={setDateEndDisplay}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div className="relative">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Motorista:
              </label>
              <input
                type="text"
                placeholder="Buscar motorista..."
                value={motoristaBusca}
                onChange={(e) => setMotoristaBusca(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {motoristaBusca && motoristasFiltrados.length > 0 && (
                <div className="absolute bg-white border border-slate-300 rounded-lg mt-1 max-h-48 overflow-y-auto w-full z-10 shadow-lg">
                  {motoristasFiltrados.map((motorista: any) => (
                    <div
                      key={motorista.conductorName}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => {
                        setSelectedMotorista(motorista.conductorName);
                        setMotoristaBusca("");
                      }}
                    >
                      {motorista.conductorName}
                    </div>
                  ))}
                </div>
              )}
              {selectedMotorista && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 flex justify-between items-center">
                  <span className="text-sm">{selectedMotorista}</span>
                  <button
                    onClick={() => setSelectedMotorista("")}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              )}
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
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                  <SelectItem value="horas_extras">Horas Extras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Operação:
              </label>
              <Select value={selectedOperacao} onValueChange={setSelectedOperacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {/* Adicionar operações dinamicamente */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Status:
              </label>
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="aplicadas">Aplicadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generatePDF}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Download className="w-4 h-4" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(reportData) && reportData.length > 0 ? (
                  reportData.map((warning: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{warning.conductorName}</TableCell>
                      <TableCell>{warning.operacao}</TableCell>
                      <TableCell>{warning.placa}</TableCell>
                      <TableCell>
                        {warning.data ? new Date(warning.data).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge>{warning.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={warning.assinada ? "default" : "secondary"}>
                          {warning.assinada ? "Assinada" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500">
                      Nenhum resultado encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
