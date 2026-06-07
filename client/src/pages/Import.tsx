import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle, Clock, Loader } from "lucide-react";
import { toast } from "sonner";

export default function Import() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const bulkImportMutation = trpc.dashboard.framentoBulkImportV4.useMutation();

  const refetchHistory = () => {};

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      // Ler arquivo como Buffer
      const buffer = await file.arrayBuffer();

      // Chamar mutation de importação
      const result = await bulkImportMutation.mutateAsync({
        arquivo: buffer as any,
      });

      if (result.success) {
        toast.success(`Importação concluída! ${result.advertenciasCriadas} advertências criadas.`);
        setImportResult({
          success: true,
          message: `Importação realizada com sucesso!`,
          totalRows: result.totalProcessado,
          newRows: result.advertenciasCriadas,
        });
      } else {
        toast.error(`Erro na importação: ${result.erros?.[0]?.erro || 'Erro desconhecido'}`);
        setImportResult({
          success: false,
          message: `Erro na importação: ${result.erros?.[0]?.erro || 'Erro desconhecido'}`,
        });
      }
      setIsProcessing(false);
    } catch (error) {
      toast.error(`Erro ao ler arquivo: ${String(error)}`);
      setImportResult({
        success: false,
        message: `Erro ao processar arquivo: ${String(error)}`,
      });
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const history = { data: [] }; // TODO: Implementar router de importação

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Importação de Dados</h1>
        <p className="text-slate-600 mt-2">
          Faça upload do arquivo Excel para importar dados de jornadas
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Arquivo Excel
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Selecione um arquivo .xls ou .xlsx com os dados de jornadas
          </p>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                  <div>
                    <p className="text-slate-700 font-medium">Processando arquivo...</p>
                    <p className="text-sm text-slate-600">Isto pode levar alguns segundos</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400" />
                  <div>
                    <p className="text-slate-700 font-medium">Clique para selecionar</p>
                    <p className="text-sm text-slate-600">ou arraste um arquivo aqui</p>
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`mt-6 p-4 rounded-lg ${
              importResult.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${
                    importResult.success ? "text-green-900" : "text-red-900"
                  }`}>
                    {importResult.message}
                  </p>
                  {importResult.totalRows && (
                    <p className={`text-sm mt-1 ${
                      importResult.success ? "text-green-700" : "text-red-700"
                    }`}>
                      Total de linhas: {importResult.totalRows} | Linhas novas: {importResult.newRows}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Importações
          </CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Últimas importações realizadas
          </p>
        </CardHeader>
        <CardContent>
          {history?.data && history.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total de Linhas</TableHead>
                  <TableHead>Linhas Novas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((imp: any) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">{imp.fileName}</TableCell>
                    <TableCell>{formatDate(imp.importedAt)}</TableCell>
                    <TableCell>{imp.rowCount}</TableCell>
                    <TableCell>{imp.newRowsCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Sucesso
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-slate-600 py-8">
              Nenhuma importação realizada ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
