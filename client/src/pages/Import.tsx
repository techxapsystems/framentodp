import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Import() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const importMutation = trpc.import.importFile.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        setSelectedFile(null);
        setValidationResult(null);
        refetchHistory();
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const validateMutation = trpc.import.validateFile.useMutation({
    onSuccess: (result) => {
      setValidationResult(result);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success("Arquivo válido!");
      }
      setIsValidating(false);
    },
    onError: (error) => {
      toast.error(`Erro na validação: ${error.message}`);
      setIsValidating(false);
    },
  });

  const { data: history, refetch: refetchHistory, isLoading: historyLoading } =
    trpc.import.getHistory.useQuery({ limit: 20 });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);

    // Validar arquivo
    setIsValidating(true);
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    validateMutation.mutate({
      fileName: file.name,
      fileBuffer: base64,
    });
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const buffer = await selectedFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    importMutation.mutate({
      fileName: selectedFile.name,
      fileBuffer: base64,
    });
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
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle>Upload de Arquivo Excel</CardTitle>
          <p className="text-sm text-slate-600">
            Selecione um arquivo .xls ou .xlsx com os dados de jornadas
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input */}
          <div className="relative">
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition"
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <div className="text-center">
                <p className="font-medium text-slate-900">
                  {selectedFile ? selectedFile.name : "Clique para selecionar arquivo"}
                </p>
                <p className="text-sm text-slate-500">
                  ou arraste um arquivo aqui
                </p>
              </div>
            </label>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div
              className={`p-4 rounded-lg ${
                validationResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {validationResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      validationResult.success
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {validationResult.message}
                  </p>
                  {validationResult.sheetName && (
                    <p className="text-sm text-slate-600 mt-1">
                      Aba: {validationResult.sheetName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          {selectedFile && validationResult?.success && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
              size="lg"
              className="w-full"
            >
              {importMutation.isPending ? "Importando..." : "Importar Agora"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Importações</CardTitle>
          <p className="text-sm text-slate-600">
            Últimas importações realizadas
          </p>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 rounded" />
              ))}
            </div>
          ) : history?.data && history.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Total Linhas</TableHead>
                    <TableHead className="text-right">Linhas Novas</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Importado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.fileName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.rowCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          +{item.newRowsCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(item.importedAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.importedBy}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600">Nenhuma importação realizada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Instruções</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900 space-y-2">
          <p>
            • O arquivo deve conter as colunas: Condutor, Data, Tempo Total Dirigido, Horas Extras 50%, Horas Extras 100%
          </p>
          <p>
            • Novos dados devem ser adicionados ao final do arquivo (append)
          </p>
          <p>
            • O sistema detecta automaticamente linhas novas baseado na contagem anterior
          </p>
          <p>
            • Datas devem estar no formato DD/MM/YYYY
          </p>
          <p>
            • Tempos devem estar no formato HH:MM
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
