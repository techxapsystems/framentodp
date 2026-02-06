import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export default function WarningTracking() {
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  // Buscar estatísticas gerais
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getWarningsSignatureStats.useQuery();

  // Buscar estatísticas por operação
  const { data: operationStats, isLoading: operationLoading } = trpc.dashboard.getWarningsSignatureStatsByOperation.useQuery();

  // Filtrar por operação se selecionada
  const filteredStats = selectedOperation
    ? operationStats?.filter(op => op.operacao === selectedOperation)
    : operationStats;

  // Obter lista única de operações
  const operations = Array.from(new Set(operationStats?.map(op => op.operacao) || []));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Acompanhamento de Advertências</h1>
        <p className="text-slate-600 mt-2">
          Monitore o status de devolução de advertências assinadas
        </p>
      </div>

      {/* KPIs Principais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total de Advertências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-2">Enviadas para assinatura</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Assinadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.assinadas}</div>
              <p className="text-xs text-slate-500 mt-2">Devolvidas assinadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Não Assinadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.naoAssinadas}</div>
              <p className="text-xs text-slate-500 mt-2">Pendentes de devolução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Taxa de Devolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.percentualAssinatura}%
              </div>
              <p className="text-xs text-slate-500 mt-2">De advertências assinadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela por Operação */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estatísticas por Operação</CardTitle>
            <Select value={selectedOperation} onValueChange={setSelectedOperation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as operações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as operações</SelectItem>
                {operations.map(op => (
                  <SelectItem key={op} value={op}>{op}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {operationLoading ? (
            <div className="text-center py-8 text-slate-500">Carregando...</div>
          ) : filteredStats && filteredStats.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operação</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Assinadas</TableHead>
                    <TableHead className="text-right">Não Assinadas</TableHead>
                    <TableHead className="text-right">Taxa (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((op, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{op.operacao}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{op.total}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-green-100 text-green-700">
                          {op.assinadas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-red-100 text-red-700">
                          {op.naoAssinadas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${op.percentual}%` }}
                            ></div>
                          </div>
                          <span className="font-medium text-sm">{op.percentual}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Nenhuma operação com advertências
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Insights</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          {stats && (
            <>
              <p>
                • <strong>{stats.total}</strong> advertências foram enviadas para assinatura
              </p>
              <p>
                • <strong>{stats.assinadas}</strong> ({stats.percentualAssinatura}%) já foram devolvidas assinadas
              </p>
              <p>
                • <strong>{stats.naoAssinadas}</strong> advertências ainda estão pendentes de devolução
              </p>
              {stats.naoAssinadas > 0 && (
                <p className="mt-4 pt-4 border-t border-blue-200">
                  ⚠️ Recomendação: Acompanhe os motoristas com advertências não assinadas para garantir conformidade
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
