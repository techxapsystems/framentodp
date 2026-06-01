import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DateMaskInput } from "@/components/DateMaskInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Week() {
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  });

  const handleWeekStartChange = (newDate: string) => {
    // Converter de DD/MM/YYYY para YYYY-MM-DD
    if (newDate.length === 10 && newDate.includes("/")) {
      const [day, month, year] = newDate.split("/");
      const isoDate = `${year}-${month}-${day}`;
      setWeekStart(isoDate);
    }
  };

  // Converter data para formato DD/MM/YYYY para exibição
  const weekStartFormatted = weekStart ? (
    weekStart.split("-").reverse().join("/")
  ) : "";

  const { data, isLoading } = trpc.dashboard.getWeekData.useQuery({
    weekStart,
  });

  const formatMinutesToTime = (minutes: number | undefined) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { weekday: "short", month: "short", day: "numeric" });
  };

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-slate-900">Status de Ociosidade - Semana</h1>
        <p className="text-slate-600 mt-2">
          Evolução de motoristas ociosos e tendências semanais
        </p>
      </div>

      {/* Filtro de Semana */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-slate-700 block mb-2">
            Início da Semana
          </label>
          <DateMaskInput
            value={weekStartFormatted}
            onChange={handleWeekStartChange}
            placeholder="DD/MM/YYYY"
          />
        </div>
      </div>

      {/* Gráficos */}
      {data?.dailyStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* % Pouco Rodado por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>% Motoristas Ociosos por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => `${value}%`}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentualPoucoRodado"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 4 }}
                    name="% Ociosos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* HE Total por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>HE Total por Dia (minutos)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => formatMinutesToTime(value)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Bar
                    dataKey="heTotal"
                    fill="#f97316"
                    name="HE Total"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Pouco Rodado */}
        {data?.topPoucoRodado && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 - Motoristas Ociosos</CardTitle>
              <p className="text-sm text-slate-600">Semana atual</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topPoucoRodado.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                        {idx + 1}
                      </Badge>
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800 border-red-300">
                      {item.count} ocorrências
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 10 HE */}
        {data?.topHe && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 - Horas Extras</CardTitle>
              <p className="text-sm text-slate-600">Semana atual</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topHe.map((item: any, idx: number) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                        {idx + 1}
                      </Badge>
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                      {formatMinutesToTime(item.minutes)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estatísticas Diárias */}
      {data?.dailyStats && (
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Diárias Detalhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total Motoristas</TableHead>
                    <TableHead className="text-right">Pouco Rodado</TableHead>
                    <TableHead className="text-right">% Pouco Rodado</TableHead>
                    <TableHead className="text-right">HE Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailyStats.map((stat: any) => (
                    <TableRow key={stat.date} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {formatDate(stat.date)}
                      </TableCell>
                      <TableCell className="text-right">{stat.totalMotoristas}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{stat.poucoRodado}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {stat.percentualPoucoRodado}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatMinutesToTime(stat.heTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
