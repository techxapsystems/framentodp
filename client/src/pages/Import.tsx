import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle, Clock, Loader, FileText, TrendingUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Import() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [processingPhase, setProcessingPhase] = useState<"reading" | "processing" | "saving">("reading");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const bulkImportMutation = trpc.dashboard.framentoBulkImportV4.useMutation();
  const deleteLastImportMutation = trpc.dashboard.deleteLastImportWarnings.useMutation();
  const { data: importHistory, refetch: refetchHistory } = trpc.dashboard.getImportHistory.useQuery({ limit: 20 });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);
    setProcessingPhase("reading");

    try {
      setProcessingPhase("reading");
      const buffer = await file.arrayBuffer();

      setProcessingPhase("processing");
      const result = await bulkImportMutation.mutateAsync({
        arquivo: buffer as any,
      });

      setProcessingPhase("saving");

      if (result.success) {
        toast.success(`Importação concluída! ${result.advertenciasCriadas} advertências criadas.`);
        setImportResult({
          success: true,
          message: `Importação realizada com sucesso!`,
          totalRows: result.totalProcessado,
          newRows: result.advertenciasCriadas,
        });
        refetchHistory();
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

  const handleDeleteLastImport = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteLastImportMutation.mutateAsync();
      
      if (result.success) {
        toast.success(`${result.deleted} advertências deletadas com sucesso!`);
        setShowDeleteDialog(false);
        refetchHistory();
      } else {
        toast.error("Erro ao deletar advertências");
      }
    } catch (error) {
      toast.error(`Erro: ${String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPhaseLabel = () => {
    switch (processingPhase) {
      case "reading":
        return "Lendo arquivo...";
      case "processing":
        return "Processando dados...";
      case "saving":
        return "Salvando no banco de dados...";
      default:
        return "Processando...";
    }
  };

  const lastImport = importHistory?.[0];

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
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-blue-200 animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-slate-700 font-medium">Processando arquivo...</p>
                    <p className="text-sm text-slate-600">{getPhaseLabel()}</p>
                    
                    <div className="flex gap-2 justify-center mt-3">
                      <div
                        className={`h-1 w-8 rounded-full transition-all duration-500 ${
                          processingPhase === "reading" ? "bg-blue-500" : "bg-slate-300"
                        }`}
                      ></div>
                      <div
                        className={`h-1 w-8 rounded-full transition-all duration-500 ${
                          processingPhase === "processing" ? "bg-blue-500" : "bg-slate-300"
                        }`}
                      ></div>
                      <div
                        className={`h-1 w-8 rounded-full transition-all duration-500 ${
                          processingPhase === "saving" ? "bg-blue-500" : "bg-slate-300"
                        }`}
                      ></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 transition-transform hover:scale-110" />
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
            <div
              className={`mt-6 p-4 rounded-lg transition-all duration-500 ${
                importResult.success
                  ? "bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2"
                  : "bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-2"
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0 animate-in zoom-in" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0 animate-in zoom-in" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      importResult.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {importResult.message}
                  </p>
                  {importResult.totalRows && (
                    <p
                      className={`text-sm mt-1 ${
                        importResult.success ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      Total de linhas: {importResult.totalRows} | Linhas novas:{" "}
                      {importResult.newRows}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Last Import Card - Professional Minimalist */}
      {lastImport && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center justify-between">
              <span>Gerenciar Última Importação</span>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                {lastImport.newRowsCount} advertências
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Info Section */}
              <div className="border-t border-b border-slate-200 py-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Arquivo:</span>
                  <span className="text-sm text-slate-900">{lastImport.fileName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Importado em:</span>
                  <span className="text-sm text-slate-900">{formatDate(lastImport.importedAt)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-600">Importado por:</span>
                  <span className="text-sm text-slate-900">{lastImport.importedBy}</span>
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <p className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold">Aviso:</span> Ao deletar esta importação, todas as {lastImport.newRowsCount} advertências criadas serão removidas do sistema. Esta ação não pode ser desfeita.
                </p>
              </div>

              {/* Delete Button */}
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deletar Importação
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Advertências?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar <span className="font-semibold">{lastImport?.newRowsCount}</span> advertências da importação de <span className="font-semibold">{lastImport?.fileName}</span>.
              <br />
              <br />
              Esta ação <span className="font-semibold">não pode ser desfeita</span>. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLastImport}
              disabled={isDeleting}
              className="bg-slate-600 hover:bg-slate-700"
            >
              {isDeleting ? "Deletando..." : "Deletar Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import History Cards */}
      {importHistory && importHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-900">Histórico de Importações</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Importado</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {importHistory.reduce((sum, imp: any) => sum + imp.rowCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Registros Novos</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {importHistory.reduce((sum, imp: any) => sum + imp.newRowsCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Importações</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {importHistory.length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-slate-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {importHistory.map((imp: any, index: number) => (
              <Card key={imp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{imp.fileName}</p>
                          <p className="text-sm text-slate-500">
                            Importado por: <span className="font-medium">{imp.importedBy}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4 ml-8">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-slate-600 font-medium">Total de Linhas</p>
                          <p className="text-lg font-bold text-blue-600">{imp.rowCount}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-slate-600 font-medium">Linhas Novas</p>
                          <p className="text-lg font-bold text-green-600">{imp.newRowsCount}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-600 font-medium">Data</p>
                          <p className="text-sm font-medium text-slate-700">{formatDate(imp.importedAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✓ Sucesso
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(!importHistory || importHistory.length === 0) && (
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
            <p className="text-center text-slate-600 py-8">
              Nenhuma importação realizada ainda
            </p>
          </CardContent>
        </Card>
      )}

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
