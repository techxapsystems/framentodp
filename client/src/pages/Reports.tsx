import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

  const getWarningLevelLabel = (nivel: number) => {
    const labels: Record<number, string> = {
      1: "Aviso 1",
      2: "Aviso 2",
      3: "Aviso 3 (Crítico)",
    };
    return labels[nivel] || `Aviso ${nivel}`;
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedConductor) {
      toast.error("Selecione um colaborador");
      return;
    }

    setIsLoading(true);
    try {
      // Buscar dados do motorista
      const conductor = conductorsData.find((c: any) => c.conductorName === selectedConductor);
      
      // Filtrar medidas do motorista selecionado
      const advertencias = (allWarningsData.advertencias || []).filter(
        (w: any) => w.nome === selectedConductor || w.conductorName === selectedConductor
      );
      const suspensoes = (allWarningsData.suspensoes || []).filter(
        (w: any) => w.nome === selectedConductor || w.conductorName === selectedConductor
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

    // Criar conteúdo HTML para PDF com relatório completo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Medidas Disciplinares</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #333; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; font-size: 14px; }
          .conductor-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #333; }
          .conductor-info p { margin: 8px 0; font-size: 13px; }
          .section { margin-bottom: 40px; page-break-inside: avoid; }
          .section h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 16px; margin-bottom: 15px; }
          .measure-item { background: #f9f9f9; padding: 15px; margin-bottom: 15px; border-left: 4px solid #0066cc; border-radius: 3px; }
          .measure-item.suspension { border-left-color: #cc0000; }
          .measure-header { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 10px; font-size: 12px; }
          .measure-header div { }
          .measure-header strong { color: #333; display: block; font-size: 11px; }
          .measure-header span { color: #666; }
          .measure-text { margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
          .measure-text label { font-weight: bold; color: #333; display: block; margin-top: 8px; }
          .status-assinada { color: green; font-weight: bold; }
          .status-pendente { color: #ff9900; font-weight: bold; }
          .footer { text-align: center; margin-top: 40px; color: #999; font-size: 10px; border-top: 1px solid #ddd; padding-top: 15px; }
          .no-data { text-align: center; color: #999; padding: 20px; font-style: italic; }
          @media print {
            .measure-item { page-break-inside: avoid; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Medidas Disciplinares</h1>
          <p>Histórico Completo de Advertências e Suspensões</p>
        </div>

        <div class="conductor-info">
          <p><strong>Colaborador:</strong> ${reportData.conductor.conductorName}</p>
          <p><strong>Operação:</strong> ${reportData.conductor.operacao || "-"}</p>
          <p><strong>Placa:</strong> ${reportData.conductor.placa || "-"}</p>
          <p><strong>Total de Medidas:</strong> ${reportData.totalMedidas}</p>
          <p><strong>Data do Relatório:</strong> ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>

        ${reportData.advertencias.length > 0 ? `
        <div class="section">
          <h2>Advertências (${reportData.advertencias.length})</h2>
          ${reportData.advertencias.map((adv: any) => `
          <div class="measure-item">
            <div class="measure-header">
              <div>
                <strong>Data de Cadastro</strong>
                <span>${formatDate(adv.criadoEm)}</span>
              </div>
              <div>
                <strong>Nível</strong>
                <span>${adv.nivelAdvertencia ? getWarningLevelLabel(adv.nivelAdvertencia) : "-"}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span class="${adv.advertenciaAplicada ? "status-assinada" : "status-pendente"}">
                  ${adv.advertenciaAplicada ? "Assinada" : "Pendente"}
                </span>
              </div>
              <div>
                <strong>Tipo</strong>
                <span>Advertência</span>
              </div>
            </div>
            <div class="measure-text">
              <label>Motivo/Descrição:</label>
              ${adv.motivo || "-"}
              ${adv.observacao ? `<label style="margin-top: 10px;">Observação:</label>${adv.observacao}` : ""}
            </div>
          </div>
          `).join("")}
        </div>
        ` : `<div class="section"><div class="no-data">Nenhuma advertência registrada</div></div>`}

        ${reportData.suspensoes.length > 0 ? `
        <div class="section">
          <h2>Suspensões (${reportData.suspensoes.length})</h2>
          ${reportData.suspensoes.map((susp: any) => `
          <div class="measure-item suspension">
            <div class="measure-header">
              <div>
                <strong>Data de Cadastro</strong>
                <span>${formatDate(susp.criadoEm)}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span class="${susp.advertenciaAplicada ? "status-assinada" : "status-pendente"}">
                  ${susp.advertenciaAplicada ? "Assinada" : "Pendente"}
                </span>
              </div>
              <div>
                <strong>Tipo</strong>
                <span>Suspensão</span>
              </div>
            </div>
            <div class="measure-text">
              <label>Motivo/Descrição:</label>
              ${susp.motivo || "-"}
              ${susp.observacao ? `<label style="margin-top: 10px;">Observação:</label>${susp.observacao}` : ""}
              ${susp.dataInicio ? `<label style="margin-top: 10px;">Período de Suspensão:</label>Início: ${formatDate(susp.dataInicio)} | Fim: ${formatDate(susp.dataFim)} | Retorno: ${formatDate(susp.dataRetorno)}` : ""}
            </div>
          </div>
          `).join("")}
        </div>
        ` : `<div class="section"><div class="no-data">Nenhuma suspensão registrada</div></div>`}

        <div class="footer">
          <p>Relatório gerado automaticamente pelo Sistema de Gestão de Motoristas - Framento Transportes</p>
          <p>Documento confidencial - Uso interno</p>
          <p>${new Date().toLocaleString("pt-BR")}</p>
        </div>
      </body>
      </html>
    `;

    // Usar a API de impressão do navegador
    const printWindow = window.open("", "", "width=900,height=1200");
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
          Histórico Completo de Advertências e Suspensões por Colaborador
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
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Informações do Colaborador</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Colaborador:</span>
                  <p className="font-medium">{reportData.conductor.conductorName}</p>
                </div>
                <div>
                  <span className="text-slate-600">Operação:</span>
                  <p className="font-medium">{reportData.conductor.operacao || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-600">Placa:</span>
                  <p className="font-medium">{reportData.conductor.placa || "-"}</p>
                </div>
                <div>
                  <span className="text-slate-600">Total de Medidas:</span>
                  <p className="font-medium">{reportData.totalMedidas}</p>
                </div>
              </div>
            </div>

            {/* Advertências */}
            {reportData.advertencias.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Badge>Advertências</Badge>
                  <span className="text-sm text-slate-600">({reportData.advertencias.length})</span>
                </h3>
                <div className="space-y-3">
                  {reportData.advertencias.map((adv: any, idx: number) => (
                    <div key={idx} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-slate-600 text-xs">Data de Cadastro</span>
                          <p className="font-medium">{formatDate(adv.criadoEm)}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs">Nível</span>
                          <p className="font-medium">{adv.nivelAdvertencia ? getWarningLevelLabel(adv.nivelAdvertencia) : "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs">Status</span>
                          <p className={`font-medium ${adv.advertenciaAplicada ? "text-green-600" : "text-orange-600"}`}>
                            {adv.advertenciaAplicada ? "Assinada" : "Pendente"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs">Tipo</span>
                          <Badge variant="default">Advertência</Badge>
                        </div>
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <p className="text-xs text-slate-600 mb-1">Motivo/Descrição:</p>
                        <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{adv.motivo || "-"}</p>
                        {adv.observacao && (
                          <>
                            <p className="text-xs text-slate-600 mb-1 mt-3">Observação:</p>
                            <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{adv.observacao}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suspensões */}
            {reportData.suspensoes.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Badge variant="destructive">Suspensões</Badge>
                  <span className="text-sm text-slate-600">({reportData.suspensoes.length})</span>
                </h3>
                <div className="space-y-3">
                  {reportData.suspensoes.map((susp: any, idx: number) => (
                    <div key={idx} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="grid grid-cols-4 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-slate-600 text-xs">Data de Cadastro</span>
                          <p className="font-medium">{formatDate(susp.criadoEm)}</p>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs">Status</span>
                          <p className={`font-medium ${susp.advertenciaAplicada ? "text-green-600" : "text-orange-600"}`}>
                            {susp.advertenciaAplicada ? "Assinada" : "Pendente"}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs">Tipo</span>
                          <Badge variant="destructive">Suspensão</Badge>
                        </div>
                      </div>
                      <div className="border-t border-red-200 pt-3">
                        <p className="text-xs text-slate-600 mb-1">Motivo/Descrição:</p>
                        <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{susp.motivo || "-"}</p>
                        {susp.observacao && (
                          <>
                            <p className="text-xs text-slate-600 mb-1 mt-3">Observação:</p>
                            <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">{susp.observacao}</p>
                          </>
                        )}
                        {susp.dataInicio && (
                          <>
                            <p className="text-xs text-slate-600 mb-1 mt-3">Período de Suspensão:</p>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-slate-600">Início:</span>
                                <p className="font-medium">{formatDate(susp.dataInicio)}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">Fim:</span>
                                <p className="font-medium">{formatDate(susp.dataFim)}</p>
                              </div>
                              <div>
                                <span className="text-slate-600">Retorno:</span>
                                <p className="font-medium">{formatDate(susp.dataRetorno)}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportData.totalMedidas === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nenhuma medida registrada para este colaborador
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
