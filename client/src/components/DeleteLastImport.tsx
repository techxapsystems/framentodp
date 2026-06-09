import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, Loader } from "lucide-react";
import { toast } from "sonner";

export default function DeleteLastImport() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteLastImportMutation = trpc.dashboard.deleteLastImportWarnings.useMutation();

  const handleDeleteImport = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteLastImportMutation.mutateAsync();
      
      if (result.success) {
        toast.success(`${result.deleted} advertências deletadas com sucesso!`);
        setShowDeleteDialog(false);
      } else {
        toast.error("Erro ao deletar advertências");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error(`Erro: ${String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-slate-900">Deletar Última Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">Aviso:</span> Ao clicar no botão abaixo, todas as advertências da última importação serão removidas do sistema. Esta ação não pode ser desfeita.
              </p>
            </div>

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
                  Deletar Última Importação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Advertências?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar todas as advertências da última importação.
              <br />
              <br />
              Esta ação <span className="font-semibold">não pode ser desfeita</span>. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImport}
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
