import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, FileText, Search } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [selectedConductor, setSelectedConductor] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Buscar todos os motoristas e medidas
  const { data: conductorsData = [] } = trpc.dashboard.getIdleDriversForWarning.useQuery();
  const { data: allWarningsData = { advertencias: [], suspensoes: [] } } = trpc.dashboard.getWarningsStatsByDriver.useQuery();

  // Filtrar motoristas baseado na busca
  const filteredConductors = conductorsData.filter((c: any) =>
    c.conductorName.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleGenerateReport = async () => {
    if (!selectedConductor) {
      toast.error("Selecione um colaborador");
      return;
    }

    setIsLoading(true);
    try {
      // Buscar dados do motorista
      const conductor = conductorsData.find((c: any) => c.conductorName === selectedConductor);
      
      // Buscar todas as medidas (advertências e suspensões)
      // Nota: Usar a query diretamente do hook já carregado
      const allWarnings = { advertencias: [], suspensoes: [] };
      
      // Filtrar medidas do motorista selecionado
      const advertencias = (allWarningsData.advertencias || []).filter(
        (w: any) => w.nome === selectedConductor
      );
      const suspensoes = (allWarningsData.suspensoes || []).filter(
        (w: any) => w.nome === selectedConductor
      );

      setReportData({
        conductor: conductor || { conductorName: selectedConductor },
        advertencias,
        suspensoes,
        totalMedidas: advertencias.length + suspensoes.length,
      });

      toast.success("Relatório gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportData) {
      toast.error("Gere um relatório primeiro");
      return;
    }

    // Criar conteúdo HTML para PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Medidas Disciplinares</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          .conductor-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .conductor-info p { margin: 5px 0; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background: #fafafa; }
          .status-assinada { color: green; font-weight: bold; }
          .status-pendente { color: orange; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Medidas Disciplinares</h1>
          <p>Histórico de Advertências e Suspensões</p>
        </div>

        <div class="conductor-info">
          <p><strong>Colaborador:</strong> ${reportData.conductor.conductorName}</p>
          <p><strong>Operação:</strong> ${reportData.conductor.operacao || "-"}</p>
          <p><strong>Placa:</strong> ${reportData.conductor.placa || "-"}</p>
          <p><strong>Total de Medidas:</strong> ${reportData.totalMedidas}</p>
          <p><strong>Data do Relatório:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>

        ${reportData.advertencias.length > 0 ? `
        <div class="section">
          <h2>Advertências (${reportData.advertencias.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Data de Cadastro</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.advertencias.map((adv: any) => `
              <tr>
                <td>${new Date(adv.data).toLocaleDateString("pt-BR")}</td>
                <td class="${adv.assinada ? "status-assinada" : "status-pendente"}">
                  ${adv.assinada ? "Assinada" : "Pendente"}
                </td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ` : ""}

        ${reportData.suspensoes.length > 0 ? `
        <div class="section">
          <h2>Suspensões (${reportData.suspensoes.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Data de Cadastro</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.suspensoes.map((susp: any) => `
              <tr>
                <td>${new Date(susp.data).toLocaleDateString("pt-BR")}</td>
                <td class="${susp.assinada ? "status-assinada" : "status-pendente"}">
                  ${susp.assinada ? "Assinada" : "Pendente"}
                </td>
              </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ` : ""}

        <div class="footer">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Motoristas</p>
          <p>${new Date().toLocaleString("pt-BR")}</p>
        </div>
      </body>
      </html>
    `;

    // Usar a API de impressão do navegador
    const printWindow = window.open("", "", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Relatório de Medidas Disciplinares
        </h1>
        <p className="text-slate-600 mt-2">
          Histórico de Advertências e Suspensões por Colaborador
        </p>
      </div>

      {/* Formulário de Geração de Relatório */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Buscar Colaborador:
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Digite o nome do colaborador..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {searchText && filteredConductors.length > 0 && (
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredConductors.map((conductor: any) => (
                <button
                  key={conductor.conductorName}
                  onClick={() => {
                    setSelectedConductor(conductor.conductorName);
                    setSearchText("");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b border-slate-200 last:border-b-0"
                >
                  <div className="font-medium">{conductor.conductorName}</div>
                  <div className="text-sm text-slate-500">
                    {conductor.operacao} • {conductor.placa}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedConductor && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Selecionado:</strong> {selectedConductor}
              </p>
            </div>
          )}

          <Button
            onClick={handleGenerateReport}
            disabled={!selectedConductor || isLoading}
            className="w-full"
          >
            {isLoading ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado do Relatório */}
      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Relatório de {reportData.conductor.conductorName}</CardTitle>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações do Colaborador */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Operação:</strong> {reportData.conductor.operacao || "-"}
              </p>
              <p className="text-sm">
                <strong>Placa:</strong> {reportData.conductor.placa || "-"}
              </p>
              <p className="text-sm">
                <strong>Total de Medidas:</strong> {reportData.totalMedidas}
              </p>
            </div>

            {/* Advertências */}
            {reportData.advertencias.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-700 mb-3">
                  Advertências ({reportData.advertencias.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-yellow-50 border-b border-yellow-200">
                      <tr>
                        <th className="text-left py-2 px-3">Data de Cadastro</th>
                        <th className="text-center py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.advertencias.map((adv: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-3">
                            {new Date(adv.data).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {adv.assinada ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                Assinada
                              </span>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suspensões */}
            {reportData.suspensoes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-700 mb-3">
                  Suspensões ({reportData.suspensoes.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 border-b border-red-200">
                      <tr>
                        <th className="text-left py-2 px-3">Data de Cadastro</th>
                        <th className="text-center py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.suspensoes.map((susp: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-3">
                            {new Date(susp.data).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {susp.assinada ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                Assinada
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-semibold">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportData.totalMedidas === 0 && (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma medida registrada para este colaborador</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
