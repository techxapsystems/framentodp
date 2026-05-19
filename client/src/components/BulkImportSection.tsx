import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle, File } from "lucide-react";
import { toast } from "sonner";

interface PreviewData {
  totalLinhas: number;
  totalMotoristas: number;
  totalComInfracao: number;
  motoristas?: Array<{
    cpf: string;
    nome: string;
    operacao: string;
    placa: string;
    totalOcorrencias: number;
    nivelAdvertencia: number;
    infracoesQtd: number;
  }>;
  motoristasComInfracao?: Array<{
    cpf: string;
    nome: string;
    operacao: string;
    totalOcorrencias: number;
    nivelAdvertencia: number;
    infracoesDetectadas: string[];
  }>;
}

export function BulkImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const previewMutation = trpc.bulkImport.previewImport.useMutation({
    onSuccess: (data) => {
      if (data.success && data.preview) {
        setPreview(data.preview);
        toast.success(`Preview carregado: ${data.preview.totalMotoristas} motoristas encontrados`);
      } else {
        toast.error(data.errors?.[0] || "Erro ao processar arquivo");
      }
    },
    onError: (error) => {
      toast.error(`Erro ao processar arquivo: ${error.message}`);
      setFile(null);
    },
  });

  const executeMutation = trpc.bulkImport.executeImport.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      setFile(null);
      setPreview(null);
      toast.success(`Importação concluída: ${data.totalAdvertenciasGeradas} advertências criadas`);
    },
    onError: (error) => {
      toast.error(`Erro ao executar importação: ${error.message}`);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const base64 = Buffer.from(buffer).toString("base64");
      previewMutation.mutate({ fileBase64: base64, fileName: selectedFile.name });
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileSelect(acceptedFiles[0]);
      }
    },
  });

  const handleExecuteImport = async () => {
    if (!file || !preview) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const base64 = Buffer.from(buffer).toString("base64");
      executeMutation.mutate({ fileBase64: base64, fileName: file.name });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleNewImport = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Advertências em Massa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Arraste o arquivo Excel aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: .xlsx, .xls</p>
            </div>

            {file && !preview && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
                <File className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">Processando...</span>
              </div>
            )}
            {file && preview && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
                <File className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="ml-auto"
                >
                  Remover
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
            {preview && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Preview da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-muted-foreground">Total de Linhas</div>
                <div className="text-2xl font-bold">{preview?.totalLinhas || 0}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-muted-foreground">Motoristas Únicos</div>
                <div className="text-2xl font-bold">{preview?.totalMotoristas || 0}</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm text-muted-foreground">Com Infrações</div>
                <div className="text-2xl font-bold text-green-600">{preview?.totalComInfracao || 0}</div>
              </div>
            </div>

            {preview && (preview.motoristasComInfracao?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Motoristas com Infrações Detectadas:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {preview.motoristasComInfracao.map((motorista, idx) => (
                    <div key={idx} className="p-2 border rounded text-sm">
                      <div className="font-medium">{motorista.nome}</div>
                      <div className="text-xs text-muted-foreground">{motorista.cpf}</div>
                      <div className="text-xs mt-1">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Nível {motorista.nivelAdvertencia}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {motorista.totalOcorrencias} ocorrência(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleNewImport}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExecuteImport}
                disabled={isProcessing || executeMutation.isPending}
                className="flex-1"
              >
                {isProcessing || executeMutation.isPending ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Processando...
                  </>
                ) : (
                  "Confirmar Importação"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {importResult.totalAdvertenciasGeradas} advertências foram criadas com sucesso!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm text-muted-foreground">Advertências Criadas</div>
                <div className="text-2xl font-bold text-green-600">
                  {importResult.totalAdvertenciasGeradas}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-muted-foreground">Sem Infrações</div>
                <div className="text-2xl font-bold">{importResult.totalSemInfracao}</div>
              </div>
            </div>

            <Button onClick={handleNewImport} className="w-full">
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
