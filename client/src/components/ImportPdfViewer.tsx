'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, X } from "lucide-react";
import { toast } from "sonner";

interface ImportPdfViewerProps {
  pdfName: string;
  pdfUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImportPdfViewer({
  pdfName,
  pdfUrl,
  isOpen,
  onClose,
}: ImportPdfViewerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!pdfUrl) {
      toast.error("URL do PDF não disponível");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erro ao baixar PDF");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📄 Visualizar PDF
          </DialogTitle>
          <DialogDescription>
            Arquivo: <span className="font-semibold text-gray-900">{pdfName}</span>
          </DialogDescription>
        </DialogHeader>

        {pdfUrl ? (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Visualização do PDF</p>
                <p className="text-sm text-blue-700 mt-1">
                  Verifique se o PDF está correto antes de confirmar a importação
                </p>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-96"
                title="PDF Viewer"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isLoading}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">PDF não disponível</p>
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
