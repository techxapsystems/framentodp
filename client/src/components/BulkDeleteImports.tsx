'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface BulkDeleteImportsProps {
  onDeleteSuccess?: () => void;
}

interface ImportRecord {
  id: number;
  fileName: string;
  rowCount: number;
  newRowsCount: number;
  importedBy: string;
  importedAt: string;
}

export function BulkDeleteImports({ onDeleteSuccess }: BulkDeleteImportsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Query para buscar últimas 3 importações
  const { mutate: getLastImports, isPending: isFetchingImports } = trpc.warningsManagement.getLastImports.useMutation({
    onSuccess: (data: any) => {
      if (data.success && data.imports.length > 0) {
        setImports(data.imports);
        toast.success(data.message);
      } else {
        toast.warning(data.message || "Nenhuma importação encontrada");
        setImports([]);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao buscar importações");
    },
  });

  // Mutation para deletar importações
  const { mutate: deleteImports, isPending: isDeleting } = trpc.warningsManagement.deleteLastImports.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success(data.message);
        setShowConfirmation(false);
        setConfirmationCode("");
        setImports([]);
        setIsOpen(false);
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao deletar importações");
    },
  });

  const handleOpenDialog = () => {
    setIsOpen(true);
    setIsLoading(true);
    getLastImports({ count: 3 });
    setIsLoading(false);
  };

  const handleConfirmDelete = () => {
    if (confirmationCode !== "DELETAR_IMPORTACOES") {
      toast.error("Código de confirmação inválido");
      return;
    }

    deleteImports({
      count: Math.min(imports.length, 3),
      confirmationCode,
    });
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpenDialog}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Apagar Últimas 3 Importações
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Apagar Importações em Massa
            </DialogTitle>
            <DialogDescription>
              ⚠️ Esta ação é irreversível. Todas as advertências e suspensões associadas serão deletadas.
            </DialogDescription>
          </DialogHeader>

          {/* Imports List */}
          <div className="space-y-4">
            {isFetchingImports ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Carregando importações...</p>
                </div>
              </div>
            ) : imports.length > 0 ? (
              <div className="space-y-3">
                <p className="font-medium text-gray-900">
                  {imports.length} importação(ões) será(ão) deletada(s):
                </p>
                {imports.map((imp, idx) => (
                  <div
                    key={imp.id}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {idx + 1}. {imp.fileName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Importado por: <span className="font-medium">{imp.importedBy}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Data: {new Date(imp.importedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          {imp.rowCount} linhas
                        </Badge>
                        <p className="text-xs text-gray-600 mt-1">
                          {imp.newRowsCount} novas
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-900">Nenhuma importação encontrada</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Não há importações recentes para deletar
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation Code */}
            {imports.length > 0 && !showConfirmation && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900 mb-2">
                  ⚠️ Aviso de Segurança
                </p>
                <p className="text-sm text-red-700">
                  Para confirmar a deleção, você precisará inserir um código de confirmação.
                </p>
              </div>
            )}

            {imports.length > 0 && !showConfirmation && (
              <Button
                variant="destructive"
                onClick={() => setShowConfirmation(true)}
                className="w-full"
              >
                Prosseguir com Deleção
              </Button>
            )}

            {showConfirmation && imports.length > 0 && (
              <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-900">
                  Digite o código de confirmação:
                </p>
                <p className="text-xs text-red-700 mb-2">
                  Código: <span className="font-mono font-semibold">DELETAR_IMPORTACOES</span>
                </p>
                <Input
                  placeholder="Digite o código aqui"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setShowConfirmation(false);
                setConfirmationCode("");
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            {showConfirmation && imports.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={confirmationCode !== "DELETAR_IMPORTACOES" || isDeleting}
                className="gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Deleção
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
