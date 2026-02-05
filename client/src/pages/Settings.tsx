import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Settings() {
  const { data: config, isLoading } = trpc.config.get.useQuery();
  const updateMutation = trpc.config.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    limitePoucoRodadoMin: 120,
    limiteHeAlertaMin: 90,
    janelaReincidenciaDias: 7,
    janelaCronicoDias: 30,
    thresholdPoucoRodado1: 1,
    thresholdPoucoRodado2: 2,
    thresholdPoucoRodado3: 3,
    thresholdPouco30d: 5,
    thresholdHe30d: 5,
  });

  useEffect(() => {
    if (config?.data) {
      setFormData({
        limitePoucoRodadoMin: config.data.limitePoucoRodadoMin,
        limiteHeAlertaMin: config.data.limiteHeAlertaMin,
        janelaReincidenciaDias: config.data.janelaReincidenciaDias,
        janelaCronicoDias: config.data.janelaCronicoDias,
        thresholdPoucoRodado1: config.data.thresholdPoucoRodado1,
        thresholdPoucoRodado2: config.data.thresholdPoucoRodado2,
        thresholdPoucoRodado3: config.data.thresholdPoucoRodado3,
        thresholdPouco30d: config.data.thresholdPouco30d,
        thresholdHe30d: config.data.thresholdHe30d,
      });
    }
  }, [config]);

  const handleChange = (field: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
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
        <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-600 mt-2">
          Ajuste os limites e thresholds para análise de infrações
        </p>
      </div>

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Limites de Detecção</CardTitle>
          <p className="text-sm text-slate-600">
            Defina os valores mínimos para identificar infrações
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="limitePoucoRodadoMin" className="text-slate-700">
                Limite Pouco Rodado (minutos)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Motoristas que dirigem menos que este valor são marcados como "pouco rodado"
              </p>
              <Input
                id="limitePoucoRodadoMin"
                type="number"
                value={formData.limitePoucoRodadoMin}
                onChange={(e) =>
                  handleChange("limitePoucoRodadoMin", parseInt(e.target.value))
                }
                className="mt-1"
              />
              <p className="text-xs text-slate-600 mt-2">
                Padrão: 120 minutos (2 horas)
              </p>
            </div>

            <div>
              <Label htmlFor="limiteHeAlertaMin" className="text-slate-700">
                Limite Alerta Horas Extras (minutos)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Horas extras acima deste valor geram alerta
              </p>
              <Input
                id="limiteHeAlertaMin"
                type="number"
                value={formData.limiteHeAlertaMin}
                onChange={(e) =>
                  handleChange("limiteHeAlertaMin", parseInt(e.target.value))
                }
                className="mt-1"
              />
              <p className="text-xs text-slate-600 mt-2">
                Padrão: 90 minutos (1.5 horas)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Janelas de Análise */}
      <Card>
        <CardHeader>
          <CardTitle>Janelas de Reincidência</CardTitle>
          <p className="text-sm text-slate-600">
            Períodos para análise de reincidências
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="janelaReincidenciaDias" className="text-slate-700">
                Janela de Reincidência (dias)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Período curto para detecção de padrões
              </p>
              <Input
                id="janelaReincidenciaDias"
                type="number"
                value={formData.janelaReincidenciaDias}
                onChange={(e) =>
                  handleChange("janelaReincidenciaDias", parseInt(e.target.value))
                }
                className="mt-1"
              />
              <p className="text-xs text-slate-600 mt-2">
                Padrão: 7 dias
              </p>
            </div>

            <div>
              <Label htmlFor="janelaCronicoDias" className="text-slate-700">
                Janela Crônica (dias)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Período longo para detecção de problemas crônicos
              </p>
              <Input
                id="janelaCronicoDias"
                type="number"
                value={formData.janelaCronicoDias}
                onChange={(e) =>
                  handleChange("janelaCronicoDias", parseInt(e.target.value))
                }
                className="mt-1"
              />
              <p className="text-xs text-slate-600 mt-2">
                Padrão: 30 dias
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds de Ação */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Ação Sugerida</CardTitle>
          <p className="text-sm text-slate-600">
            Número de ocorrências que disparam ações automáticas
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="thresholdPoucoRodado1" className="text-slate-700">
                Threshold 1 (Orientativa)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Ocorrências que geram "Orientativa rápida"
              </p>
              <Input
                id="thresholdPoucoRodado1"
                type="number"
                value={formData.thresholdPoucoRodado1}
                onChange={(e) =>
                  handleChange("thresholdPoucoRodado1", parseInt(e.target.value))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="thresholdPoucoRodado2" className="text-slate-700">
                Threshold 2 (Ajuste)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Ocorrências que geram "Orientativa + ajuste"
              </p>
              <Input
                id="thresholdPoucoRodado2"
                type="number"
                value={formData.thresholdPoucoRodado2}
                onChange={(e) =>
                  handleChange("thresholdPoucoRodado2", parseInt(e.target.value))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="thresholdPoucoRodado3" className="text-slate-700">
                Threshold 3 (Crítico)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Ocorrências que geram "Escalar para Gestor"
              </p>
              <Input
                id="thresholdPoucoRodado3"
                type="number"
                value={formData.thresholdPoucoRodado3}
                onChange={(e) =>
                  handleChange("thresholdPoucoRodado3", parseInt(e.target.value))
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <Label htmlFor="thresholdPouco30d" className="text-slate-700">
                Threshold Pouco Rodado (30 dias)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Ocorrências em 30 dias que geram "Crítico"
              </p>
              <Input
                id="thresholdPouco30d"
                type="number"
                value={formData.thresholdPouco30d}
                onChange={(e) =>
                  handleChange("thresholdPouco30d", parseInt(e.target.value))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="thresholdHe30d" className="text-slate-700">
                Threshold HE (30 dias)
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Ocorrências em 30 dias que geram "Revisar escala/rota"
              </p>
              <Input
                id="thresholdHe30d"
                type="number"
                value={formData.thresholdHe30d}
                onChange={(e) =>
                  handleChange("thresholdHe30d", parseInt(e.target.value))
                }
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Sobre as Configurações</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900 space-y-2 text-sm">
          <p>
            • As configurações afetam como as infrações são detectadas e classificadas
          </p>
          <p>
            • Alterações entram em vigor imediatamente para novos cálculos
          </p>
          <p>
            • Você pode recalcular dados históricos na tela de Importação
          </p>
          <p>
            • Recomendamos não alterar frequentemente para manter consistência
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
