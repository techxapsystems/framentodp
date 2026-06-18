'use client';
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Download, FileUp } from 'lucide-react';
import { BulkDeleteImports } from '@/components/BulkDeleteImports';
import { trpc } from '@/lib/trpc';

interface DryRunResult {
  success: boolean;
  dryRun: boolean;
  totalProcessado: number;
  advertenciasQueSeriaoCriadas: number;
  emRevisao: number;
  conferencia: number;
  pdfs: string[];
  abaSelecionada: string;
  erros: Array<{ erro: string }>;
  avisoImportante: string;
}

export default function BulkImportDryRun() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [cnpj, setCnpj] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [endereco, setEndereco] = useState('');

  const dryRunMutation = trpc.dashboard.framentoDryRun.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await dryRunMutation.mutateAsync({
        arquivo: Buffer.from(buffer),
        cnpj,
        empresa,
        endereco,
      });

      setResult(result as DryRunResult);
      toast.success('Dry Run concluído com sucesso!');
    } catch (error) {
      console.error('Erro no Dry Run:', error);
      toast.error(`Erro: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDFs = async () => {
    if (!result?.pdfs.length) {
      toast.error('Nenhum PDF disponível para download');
      return;
    }

    try {
      setLoading(true);
      
      // Criar um ZIP com todos os PDFs
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (const pdfName of result.pdfs) {
        // Aqui você precisaria buscar o PDF do servidor
        // Por enquanto, apenas listamos os nomes
        zip.file(`${pdfName}.txt`, `PDF: ${pdfName}`);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `framento-dry-run-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('PDFs baixados com sucesso!');
    } catch (error) {
      console.error('Erro ao baixar PDFs:', error);
      toast.error('Erro ao baixar PDFs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teste de Importação (Dry Run)</h1>
            <p className="text-muted-foreground">
              Processe a planilha Excel e visualize os PDFs que serão gerados, sem salvar nada no banco de dados.
            </p>
          </div>
          <BulkDeleteImports onDeleteSuccess={() => toast.success("Importações deletadas com sucesso")} />
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Selecionar Arquivo
          </CardTitle>
          <CardDescription>
            Faça upload da planilha Excel com os dados de importação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ (opcional)</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa (opcional)</Label>
              <Input
                id="empresa"
                placeholder="Nome da empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço (opcional)</Label>
              <Input
                id="endereco"
                placeholder="Endereço"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Processando...' : 'Selecionar Arquivo Excel'}
            </Button>
            {fileName && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo: <strong>{fileName}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <>
          {/* Warning Banner */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    ⚠️ Dry Run - Modo de Teste
                  </h3>
                  <p className="text-sm text-yellow-800 mt-1">
                    {result.avisoImportante}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Resumo do Processamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Processado</p>
                  <p className="text-2xl font-bold">{result.totalProcessado}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Advertências a Criar</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {result.advertenciasQueSeriaoCriadas}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Em Revisão</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {result.emRevisao}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Conferência</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {result.conferencia}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Aba Selecionada: <strong>{result.abaSelecionada}</strong>
                </p>
              </div>

              {result.erros.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-900 mb-2">
                    Erros Encontrados ({result.erros.length}):
                  </p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {result.erros.slice(0, 5).map((err, i) => (
                      <li key={i}>• {err.erro}</li>
                    ))}
                    {result.erros.length > 5 && (
                      <li>... e mais {result.erros.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDFs Generated */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                PDFs Gerados ({result.pdfs.length})
              </CardTitle>
              <CardDescription>
                Estes são os PDFs que seriam criados na importação real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.pdfs.length > 0 ? (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.pdfs.map((pdf, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <span className="text-sm font-mono">{pdf}</span>
                        <Badge variant="outline">PDF</Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleDownloadPDFs}
                    disabled={loading}
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDFs (ZIP)
                  </Button>

                  <Button
                    onClick={() => {
                      setResult(null);
                      setFileName('');
                      setCnpj('');
                      setEmpresa('');
                      setEndereco('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Testar Outro Arquivo
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum PDF foi gerado. Verifique os erros acima.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">Próximos Passos:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Revise os PDFs gerados acima</li>
                <li>Valide se os dados estão corretos</li>
                <li>Se tudo estiver OK, execute a importação real</li>
                <li>Se houver erros, corrija a planilha e teste novamente</li>
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
