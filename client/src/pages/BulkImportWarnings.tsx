import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Upload, Loader } from "lucide-react";
import { toast } from "sonner";

interface PreviewData {
  totalLinhas: number;
  totalMotoristas: number;
  totalComInfracao: number;
  motoristas: Array<{
    cpf: string;
    nome: string;
    operacao: string;
    placa: string;
    totalOcorrencias: number;
    nivelAdvertencia: number;
    infracoesQtd: number;
  }>;
}

export function BulkImportWarnings() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const previewMutation = trpc.bulkImport.previewImport.useMutation();
  const executeMutation = trpc.bulkImport.executeImport.useMutation();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        toast.error("Por favor, envie um arquivo Excel válido");
        return;
      }

      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(null);
      setImportResult(null);

      // Converte arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];

        try {
          setIsProcessing(true);
          const result = await previewMutation.mutateAsync({
            fileBase64: base64,
            fileName: selectedFile.name,
          });

          if (result.success && result.preview) {
            setPreview(result.preview);
            toast.success(
              `Análise concluída: ${result.preview.totalComInfracao} motoristas com infrações detectadas`
            );
          } else {
            toast.error(`Erro: ${result.errors.join("; ")}`);
          }
        } catch (error) {
          toast.error(`Erro ao processar arquivo: ${String(error)}`);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(selectedFile);
    },
  });

  const handleExecuteImport = async () => {
    if (!file || !preview) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];

      try {
        setIsProcessing(true);
        const result = await executeMutation.mutateAsync({
          fileBase64: base64,
          fileName: file.name,
        });

        setImportResult(result);
        toast.success(
          `Importação concluída! ${result.totalAdvertenciasGeradas} advertências geradas`
        );
      } catch (error) {
        toast.error(`Erro ao importar: ${String(error)}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const nivelTexto = {
    0: "Sem infração",
    1: "Aviso (1º)",
    2: "Advertência (2º)",
    3: "Suspensão (3º)",
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Importação em Massa de Advertências</h1>
        <p className="text-gray-600 mt-2">
          Importe uma planilha Excel com dados de motoristas para gerar advertências automaticamente
        </p>
      </div>

      {/* Upload Area */}
      <Card className="p-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? "Solte o arquivo aqui" : "Arraste um arquivo Excel aqui"}
          </p>
          <p className="text-sm text-gray-500">ou clique para selecionar</p>
          {file && <p className="text-sm text-green-600 mt-4">Arquivo: {file.name}</p>}
        </div>
      </Card>

      {/* Preview */}
      {preview && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold">Análise do Arquivo</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total de Linhas</p>
              <p className="text-2xl font-bold">{preview.totalLinhas}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total de Motoristas</p>
              <p className="text-2xl font-bold">{preview.totalMotoristas}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-blue-600 font-medium">Com Infrações</p>
              <p className="text-2xl font-bold text-blue-600">{preview.totalComInfracao}</p>
            </div>
          </div>

          {preview.motoristas.length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-4">Motoristas com Infrações Detectadas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">CPF</th>
                      <th className="px-4 py-2 text-left">Nome</th>
                      <th className="px-4 py-2 text-left">Operação</th>
                      <th className="px-4 py-2 text-left">Placa</th>
                      <th className="px-4 py-2 text-center">Ocorrências</th>
                      <th className="px-4 py-2 text-center">Infrações</th>
                      <th className="px-4 py-2 text-center">Nível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.motoristas.slice(0, 10).map((m, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{m.cpf}</td>
                        <td className="px-4 py-2">{m.nome}</td>
                        <td className="px-4 py-2">{m.operacao}</td>
                        <td className="px-4 py-2 font-mono">{m.placa}</td>
                        <td className="px-4 py-2 text-center">{m.totalOcorrencias}</td>
                        <td className="px-4 py-2 text-center">{m.infracoesQtd}</td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              m.nivelAdvertencia === 3
                                ? "bg-red-100 text-red-700"
                                : m.nivelAdvertencia === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {nivelTexto[m.nivelAdvertencia as keyof typeof nivelTexto]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.motoristas.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... e mais {preview.motoristas.length - 10} motoristas
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Importação"
              )}
            </Button>
            <Button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setImportResult(null);
              }}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card className="p-6 space-y-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-green-700">Importação Concluída com Sucesso!</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border border-green-200">
              <p className="text-sm text-gray-600">Advertências Geradas</p>
              <p className="text-2xl font-bold text-green-600">
                {importResult.totalAdvertenciasGeradas}
              </p>
            </div>
            <div className="bg-white p-4 rounded border border-green-200">
              <p className="text-sm text-gray-600">Sem Infrações</p>
              <p className="text-2xl font-bold text-gray-600">{importResult.totalSemInfracao}</p>
            </div>
          </div>

          <Button
            onClick={() => {
              setFile(null);
              setPreview(null);
              setImportResult(null);
            }}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Nova Importação
          </Button>
        </Card>
      )}
    </div>
  );
}
