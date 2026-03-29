import { useState, useEffect, useMemo, useRef } from "react";
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
import { Download, FileText, Filter, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Input } from "@/components/ui/input";

export default function Reports() {
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [warnings, setWarnings] = useState<any[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar operações ao montar o componente
  useEffect(() => {
    const loadOperations = async () => {
      try {
        const response = await fetch("/api/auth/warnings-stats-by-driver");
        const result = await response.json();
        const data = result.result?.data?.json || [];
        
        // Extrair operações únicas (filtrar vazias)
        const uniqueOps = new Set<string>();
        data.forEach((item: any) => {
          if (item.operacao && item.operacao.trim() !== '') uniqueOps.add(item.operacao);
        });
        const opsArray = Array.from(uniqueOps).sort();
        setOperations(opsArray);
        setWarnings(data);
      } catch (error) {
        console.error("Erro ao carregar operações:", error);
      }
    };
    loadOperations();
  }, []);

  // Função para buscar com filtros
  const handleSearch = async () => {
    try {
      setIsLoading(true);
      
      // Pegar valores diretamente dos refs
      const startDate = startDateRef.current?.value || "";
      const endDate = endDateRef.current?.value || "";
      
      console.log('Search triggered with:', { startDate, endDate, selectedOperation });
      
      // Construir URL com parâmetros de filtro
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedOperation) params.append('operation', selectedOperation);
      
      const url = `/api/auth/warnings-stats-by-driver${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching URL:', url);
      const response = await fetch(url);
      const result = await response.json();
      const data = result.result?.data?.json || [];
      
      console.log('Loaded', data.length, 'warnings');
      setWarnings(data);
      
      if (data.length === 0) {
        toast.info("Nenhuma advertência encontrada com os filtros aplicados");
      }
    } catch (error) {
      console.error("Erro ao carregar advertências:", error);
      toast.error("Erro ao carregar advertências");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar advertências por critérios (apenas busca, data já é filtrada no backend)
  const filteredWarnings = useMemo(() => {
    return warnings.filter((warning) => {
      const matchesSearch = searchText === "" || 
        warning.nome?.toLowerCase().includes(searchText.toLowerCase());
      const matchesOperation = selectedOperation === "" || warning.operacao === selectedOperation;
      
      return matchesSearch && matchesOperation;
    });
  }, [warnings, searchText, selectedOperation]);

  const generatePDF = async () => {
    if (filteredWarnings.length === 0) {
      toast.error("Nenhum dado para gerar relatório");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Relatório de Advertências", 10, 10);

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
                  {operations.filter((op) => op && op.trim() !== '').map((op) => (
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
                ref={startDateRef}
                type="date"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                ref={endDateRef}
                type="date"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
              <Search className="w-4 h-4" />
              Buscar
            </Button>
            <Button onClick={generatePDF} variant="outline" disabled={filteredWarnings.length === 0} className="gap-2">
              <Download className="w-4 h-4" />
              Gerar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Resultados ({filteredWarnings.length})
            </span>
          </CardTitle>
          <CardDescription>Mostrando {filteredWarnings.length} advertência(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredWarnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma advertência encontrada. Clique em "Buscar" para carregar os dados.</p>
            </div>
          ) : (
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
                  {filteredWarnings.map((warning, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{warning.nome || "-"}</TableCell>
                      <TableCell>{warning.operacao || "-"}</TableCell>
                      <TableCell>{warning.placa || "-"}</TableCell>
                      <TableCell>
                        {warning.data ? new Date(warning.data).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell>{warning.tipo || "Advertência"}</TableCell>
                      <TableCell>
                        <Badge variant={warning.assinada ? "default" : "secondary"}>
                          {warning.assinada ? "Assinada" : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
