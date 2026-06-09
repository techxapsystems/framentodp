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
import { Trash2, Loader, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ImportHistory() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  const deleteLastImportMutation = trpc.dashboard.deleteLastImportWarnings.useMutation();
  const { data: importHistory = [], refetch: refetchHistory, isLoading } = trpc.dashboard.getImportHistory.useQuery({ limit: 3 });

  const handleDeleteImport = async (importId?: string) => {
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

  // Se não há histórico, não renderiza nada
  if (!importHistory || importHistory.length === 0) {
    return null;
  }

  return (
    <>
      {/* Últimas 3 Importações com Botões de Delete */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Últimas Importações</h2>
        </div>

        {importHistory.map((imp: any, index: number) => (
          <Card key={imp.id} className="border-slate-200 bg-white hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center justify-between">
                <span className="text-base">{imp.fileName}</span>
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                  {imp.newRowsCount} advertências
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Info Section */}
                <div className="border-t border-b border-slate-200 py-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-600">Importado em:</span>
                    <span className="text-sm text-slate-900">{formatDate(imp.importedAt)}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-600">Importado por:</span>
                    <span className="text-sm text-slate-900">{imp.importedBy}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-600">Total de linhas:</span>
                    <span className="text-sm text-slate-900">{imp.rowCount}</span>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold">Aviso:</span> Ao deletar esta importação, todas as {imp.newRowsCount} advertências criadas serão removidas do sistema. Esta ação não pode ser desfeita.
                  </p>
                </div>

                {/* Delete Button */}
                <Button
                  onClick={() => {
                    setSelectedImportId(imp.id);
                    setShowDeleteDialog(true);
                  }}
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
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Advertências?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar todas as advertências desta importação.
              <br />
              <br />
              Esta ação <span className="font-semibold">não pode ser desfeita</span>. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteImport(selectedImportId || undefined)}
              disabled={isDeleting}
              className="bg-slate-600 hover:bg-slate-700"
            >
              {isDeleting ? "Deletando..." : "Deletar Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
