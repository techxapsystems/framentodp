import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WarningsDashboard() {
  const [activeCategory, setActiveCategory] = useState<"advertencias" | "suspensoes">("advertencias");
  
  const { data: driverStatsResult, isLoading: loadingDriver } =
    trpc.dashboard.getWarningsStatsByDriver.useQuery();
  
  const driverStats = driverStatsResult as any || { advertencias: [], suspensoes: [] };
  const currentStats = activeCategory === "advertencias" ? driverStats.advertencias || [] : driverStats.suspensoes || [];

  if (loadingDriver) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const advertenciasCount = (driverStats.advertencias || []).length;
  const suspensoesCount = (driverStats.suspensoes || []).length;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard de Medidas Disciplinares
        </h1>
        <p className="text-slate-600 mt-2">
          Acompanhamento de Advertências e Suspensões
        </p>
      </div>

      {/* Tabs para separar Advertências e Suspensões */}
      <Tabs value={activeCategory} onValueChange={(v: any) => setActiveCategory(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advertencias" className="relative">
            Advertências
            <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {advertenciasCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="suspensoes" className="relative">
            Suspensões
            <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              {suspensoesCount}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Advertências */}
        <TabsContent value="advertencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Advertências</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStats && currentStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-300 bg-yellow-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Motorista</th>
                        <th className="text-left py-3 px-4 font-semibold">Operação</th>
                        <th className="text-left py-3 px-4 font-semibold">Placa</th>
                        <th className="text-left py-3 px-4 font-semibold">Data</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStats.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{String(item.nome || '')}</td>
                          <td className="py-3 px-4">{String(item.operacao || '')}</td>
                          <td className="py-3 px-4">{String(item.placa || '-')}</td>
                          <td className="py-3 px-4">
                            {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.assinada ? (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Assinada
                              </span>
                            ) : (
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma advertência registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspensões */}
        <TabsContent value="suspensoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Suspensões</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStats && currentStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-300 bg-red-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Motorista</th>
                        <th className="text-left py-3 px-4 font-semibold">Operação</th>
                        <th className="text-left py-3 px-4 font-semibold">Placa</th>
                        <th className="text-left py-3 px-4 font-semibold">Data</th>
                        <th className="text-center py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStats.map((item: any) => (
                        <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{String(item.nome || '')}</td>
                          <td className="py-3 px-4">{String(item.operacao || '')}</td>
                          <td className="py-3 px-4">{String(item.placa || '-')}</td>
                          <td className="py-3 px-4">
                            {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "-"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.assinada ? (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Assinada
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma suspensão registrada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
