'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WarningPdfViewerProps {
  warningId: number;
  conductorName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export function WarningPdfViewer({
  warningId,
  conductorName,
  isOpen,
  onClose,
  onConfirm,
}: WarningPdfViewerProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Query para buscar o PDF
  const { data: pdfData, isLoading: isFetchingPdf } = trpc.warningsManagement.getWarningPdf.useQuery(
    { warningId },
    { enabled: isOpen }
  );

  const handleDownload = async () => {
    if (!pdfData?.pdfUrl) return;

    try {
      const response = await fetch(pdfData.pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `advertencia-${conductorName}-${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erro ao baixar PDF");
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📄 Visualizar Advertência
          </DialogTitle>
          <DialogDescription>
            Motorista: <span className="font-semibold text-gray-900">{conductorName}</span>
          </DialogDescription>
        </DialogHeader>

        {isFetchingPdf ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando PDF...</p>
            </div>
          </div>
        ) : pdfData?.pdfUrl ? (
          <div className="space-y-4">
            {/* PDF Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Informações do PDF</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Verifique se os dados estão corretos antes de confirmar
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-gray-600">Motorista</p>
                  <p className="font-semibold text-gray-900">{pdfData.conductorName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Operação</p>
                  <p className="font-semibold text-gray-900">{pdfData.operacao}</p>
                </div>
                <div>
                  <p className="text-gray-600">Placa</p>
                  <Badge variant="outline">{pdfData.licensePlate}</Badge>
                </div>
                <div>
                  <p className="text-gray-600">Gerado em</p>
                  <p className="text-sm text-gray-700">
                    {new Date(pdfData.geradoEm).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={`${pdfData.pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-96"
                title="PDF Viewer"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700"
              >
                ✅ Confirmar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">PDF não encontrado</p>
              <Button
                variant="outline"
                onClick={onClose}
                className="mt-4"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
