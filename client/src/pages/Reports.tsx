import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Download, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Input } from "@/components/ui/input";

export default function Reports() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [warnings, setWarnings] = useState<any[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados de advertências
  useEffect(() => {
    const loadWarnings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/warnings-stats-by-driver");
        const result = await response.json();
        const data = result.result?.data?.json || [];
        
        // Extrair operações únicas (filtrar vazias)
        const uniqueOps = new Set<string>();
        data.forEach((item: any) => {
          if (item.operacao && item.operacao.trim() !== '') uniqueOps.add(item.operacao);
        });
        const opsArray = Array.from(uniqueOps).sort();
        console.log('Operations loaded:', opsArray);
        setOperations(opsArray);
        
        setWarnings(data);
      } catch (error) {
        console.error("Erro ao carregar advertências:", error);
        toast.error("Erro ao carregar advertências");
      } finally {
        setIsLoading(false);
      }
    };
    loadWarnings();
  }, []);

  // Filtrar advertências por critérios
  const filteredWarnings = useMemo(() => {
    return warnings.filter((warning) => {
      const matchesSearch = searchText === "" || 
        warning.nome?.toLowerCase().includes(searchText.toLowerCase());
      const matchesOperation = selectedOperation === "" || warning.operacao === selectedOperation;
      
      // Filtro por data (se aplicável)
      let matchesDate = true;
      if (startDate || endDate) {
        const warningDate = warning.data ? new Date(warning.data) : null;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && warningDate && warningDate < start) matchesDate = false;
        if (end && warningDate && warningDate > end) matchesDate = false;
      }
      
      return matchesSearch && matchesOperation && matchesDate;
    });
  }, [warnings, searchText, selectedOperation, startDate, endDate]);

  const generatePDF = async () => {
    if (filteredWarnings.length === 0) {
      toast.error("Nenhum dado para gerar relatório");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Relatório de Advertências", 10, 10);
      doc.setFontSize(10);
      doc.text(
        `Período: ${startDate || "Início"} a ${endDate || "Fim"}`,
        10,
        20
      );

      const tableData = filteredWarnings.map((w: any) => [
        w.nome || "",
        w.operacao || "",
        w.placa || "",
        w.data ? new Date(w.data).toLocaleDateString("pt-BR") : "",
        w.tipo || "Advertência",
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
        `Total de advertências: ${filteredWarnings.length}`,
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relatórios de Advertências</h1>
        <p className="text-muted-foreground mt-2">
          Gere relatórios filtrados por período, motorista ou operação
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>Customize os filtros para gerar o relatório desejado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por Motorista */}
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar Motorista</label>
              <Input
                placeholder="Digite o nome do motorista..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {/* Filtro por Operação */}
            <div>
              <label className="text-sm font-medium mb-2 block">Operação</label>
              <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as operações" />
                </SelectTrigger>
                <SelectContent>
                  {operations.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Botão Gerar PDF */}
          <div className="flex gap-2 justify-end">
            <Button
              onClick={generatePDF}
              disabled={filteredWarnings.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Download className="w-4 h-4" />
              Gerar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados ({filteredWarnings.length})</CardTitle>
          <CardDescription>
            {filteredWarnings.length === 0 
              ? "Nenhuma advertência encontrada com os filtros aplicados" 
              : `Mostrando ${filteredWarnings.length} advertência(s)`}
          </CardDescription>
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
                {filteredWarnings.length > 0 ? (
                  filteredWarnings.map((warning: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{warning.nome}</TableCell>
                      <TableCell>{warning.operacao}</TableCell>
                      <TableCell>{warning.placa || "-"}</TableCell>
                      <TableCell>
                        {warning.data ? new Date(warning.data).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Advertência</Badge>
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
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
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
