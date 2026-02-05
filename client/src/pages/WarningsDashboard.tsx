import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#00FF00", "#FFA500", "#FF6B6B"];

export default function WarningsDashboard() {
  const { data: driverStats, isLoading: loadingDriver } =
    trpc.dashboard.getWarningsStatsByDriver.useQuery();
  const { data: operationStats, isLoading: loadingOperation } =
    trpc.dashboard.getWarningsStatsByOperation.useQuery();

  if (loadingDriver || loadingOperation) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-lg" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Dashboard de Advertências
        </h1>
        <p className="text-slate-600 mt-2">
          Análise de advertências por motorista e operação
        </p>
      </div>

      <Tabs defaultValue="motorista" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="motorista">Por Motorista</TabsTrigger>
          <TabsTrigger value="operacao">Por Operação</TabsTrigger>
        </TabsList>

        {/* Por Motorista */}
        <TabsContent value="motorista" className="space-y-6">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle>Advertências por Motorista</CardTitle>
            </CardHeader>
            <CardContent>
              {driverStats && driverStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={driverStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="motorista" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="aviso1" stackId="a" fill="#FFA500" name="Aviso 1" />
                    <Bar dataKey="aviso2" stackId="a" fill="#FF8C00" name="Aviso 2" />
                    <Bar dataKey="aviso3" stackId="a" fill="#FF6B6B" name="Aviso 3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma advertência registrada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Detalhes */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Motorista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-300">
                    <tr>
                      <th className="text-left py-2 px-4">Motorista</th>
                      <th className="text-center py-2 px-4">Aviso 1</th>
                      <th className="text-center py-2 px-4">Aviso 2</th>
                      <th className="text-center py-2 px-4">Aviso 3</th>
                      <th className="text-center py-2 px-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverStats && driverStats.length > 0 ? (
                      driverStats.map((stat: any) => (
                        <tr key={stat.motorista} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-4 font-medium">{stat.motorista}</td>
                          <td className="text-center py-2 px-4">{stat.aviso1}</td>
                          <td className="text-center py-2 px-4">{stat.aviso2}</td>
                          <td className="text-center py-2 px-4">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                              {stat.aviso3}
                            </span>
                          </td>
                          <td className="text-center py-2 px-4 font-bold">{stat.total}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-500">
                          Nenhuma advertência registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Operação */}
        <TabsContent value="operacao" className="space-y-6">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle>Advertências por Operação</CardTitle>
            </CardHeader>
            <CardContent>
              {operationStats && operationStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={operationStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operacao" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="aviso1" stackId="a" fill="#FFA500" name="Aviso 1" />
                    <Bar dataKey="aviso2" stackId="a" fill="#FF8C00" name="Aviso 2" />
                    <Bar dataKey="aviso3" stackId="a" fill="#FF6B6B" name="Aviso 3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma advertência registrada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pizza */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Advertências por Operação</CardTitle>
            </CardHeader>
            <CardContent>
              {operationStats && operationStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={operationStats}
                      dataKey="total"
                      nameKey="operacao"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {operationStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  Nenhuma advertência registrada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabela de Detalhes */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Operação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-300">
                    <tr>
                      <th className="text-left py-2 px-4">Operação</th>
                      <th className="text-center py-2 px-4">Aviso 1</th>
                      <th className="text-center py-2 px-4">Aviso 2</th>
                      <th className="text-center py-2 px-4">Aviso 3</th>
                      <th className="text-center py-2 px-4">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationStats && operationStats.length > 0 ? (
                      operationStats.map((stat: any) => (
                        <tr key={stat.operacao} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2 px-4 font-medium">{stat.operacao}</td>
                          <td className="text-center py-2 px-4">{stat.aviso1}</td>
                          <td className="text-center py-2 px-4">{stat.aviso2}</td>
                          <td className="text-center py-2 px-4">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                              {stat.aviso3}
                            </span>
                          </td>
                          <td className="text-center py-2 px-4 font-bold">{stat.total}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-500">
                          Nenhuma advertência registrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
