import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown, TrendingUp, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface AIInsightsPanelProps {
  startDate: string;
  endDate: string;
  operacao?: string;
}

export function AIInsightsPanel({ startDate, endDate, operacao }: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Query para insights de IA
  const { data: insightsData, isLoading, refetch } = trpc.warningsAI.getAIInsights.useQuery(
    {
      startDate,
      endDate,
      operacao,
    },
    {
      enabled: !!startDate && !!endDate,
    }
  );

  // Refetch quando filtros mudam
  useEffect(() => {
    refetch();
  }, [startDate, endDate, operacao, refetch]);

  const handleRefresh = () => {
    refetch();
    setLastUpdated(new Date());
    toast.success("Insights atualizados!");
  };

  useEffect(() => {
    if (insightsData) {
      setLastUpdated(new Date());
    }
  }, [insightsData]);

  if (!startDate || !endDate) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-base">Insights Preditivos com IA</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded ? "Recolher" : "Expandir"}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Análise preditiva de tendências e riscos operacionais
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ) : insightsData?.success ? (
            <div className="space-y-4">
              {/* Resumo de Contexto - KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/50 rounded-lg p-3 border border-purple-200/50">
                  <div className="text-xs text-muted-foreground font-medium">Advertências</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {insightsData.context.metricas.totalAdvertencias}
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-red-200/50">
                  <div className="text-xs text-muted-foreground font-medium">Suspensões</div>
                  <div className="text-2xl font-bold text-red-600">
                    {insightsData.context.metricas.totalSuspensoes}
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-blue-200/50">
                  <div className="text-xs text-muted-foreground font-medium">Motoristas</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {insightsData.context.metricas.motoristesAfetados}
                  </div>
                </div>
                <div
                  className={`bg-white/50 rounded-lg p-3 border ${
                    insightsData.context.tendencias.direcao === "PIORANDO"
                      ? "border-red-200/50"
                      : insightsData.context.tendencias.direcao === "MELHORANDO"
                        ? "border-green-200/50"
                        : "border-yellow-200/50"
                  }`}
                >
                  <div className="text-xs text-muted-foreground font-medium">Tendência</div>
                  <div className="flex items-center gap-1">
                    {insightsData.context.tendencias.direcao === "PIORANDO" ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : insightsData.context.tendencias.direcao === "MELHORANDO" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="font-bold text-sm">
                      {insightsData.context.tendencias.direcao}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Motoristas em Risco */}
              {insightsData.context.topMotoristas.length > 0 && (
                <div className="bg-red-50/50 rounded-lg p-3 border border-red-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="font-semibold text-sm text-red-900">Motoristas em Risco Crítico</h4>
                  </div>
                  <div className="space-y-1">
                    {insightsData.context.topMotoristas.slice(0, 3).map((motorista: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-800">
                        <span className="font-medium">{motorista.nome}</span>
                        {" - "}
                        <span>{motorista.totalAvisos} avisos (nível {motorista.nivelMaximo})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Operações */}
              {insightsData.context.topOperacoes.length > 0 && (
                <div className="bg-orange-50/50 rounded-lg p-3 border border-orange-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <h4 className="font-semibold text-sm text-orange-900">Operações em Foco</h4>
                  </div>
                  <div className="space-y-1">
                    {insightsData.context.topOperacoes.slice(0, 3).map((operacao: any, idx: number) => (
                      <div key={idx} className="text-xs text-orange-800">
                        <span className="font-medium">{operacao.nome}</span>
                        {" - "}
                        <span>
                          {operacao.totalAvisos} avisos, {operacao.totalSuspensoes} suspensões
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights Detalhados - Formato Executivo */}
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-200/50 overflow-hidden">
                <div className="text-sm text-foreground space-y-2 p-3 max-h-96 overflow-y-auto prose prose-sm max-w-none">
                  <Streamdown>
                    {typeof insightsData.insights === 'string' 
                      ? insightsData.insights 
                      : JSON.stringify(insightsData.insights)}
                  </Streamdown>
                </div>
              </div>

              {/* Período & Status */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t space-y-1">
                <div>Período: {insightsData.context.periodo.dataInicio} a {insightsData.context.periodo.dataFim}</div>
                {operacao && <div>Operação: {operacao}</div>}
                {lastUpdated && <div className="text-purple-600 font-medium">✓ Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}</div>}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Não foi possível gerar insights. Tente novamente.</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
