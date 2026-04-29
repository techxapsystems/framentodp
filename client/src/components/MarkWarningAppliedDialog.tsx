import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface MarkWarningAppliedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warningId: number;
  conductorName: string;
  onSuccess?: () => void;
}

export function MarkWarningAppliedDialog({
  open,
  onOpenChange,
  warningId,
  conductorName,
  onSuccess,
}: MarkWarningAppliedDialogProps) {
  const [dataAplicacao, setDataAplicacao] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [assinada, setAssinada] = useState<string>("nao");
  const [dataAssinatura, setDataAssinatura] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [observacoes, setObservacoes] = useState<string>("");

  const markAppliedMutation = trpc.dashboard.markWarningApplied.useMutation({
    onSuccess: () => {
      toast.success("Advertência marcada como aplicada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
      // Disparar evento para o dashboard se atualizar automaticamente
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = async () => {
    if (!dataAplicacao) {
      toast.error("Data de aplicação é obrigatória");
      return;
    }

    await markAppliedMutation.mutateAsync({
      warningId,
      dataAplicacao,
      assinada: assinada === "sim",
      dataAssinatura: assinada === "sim" ? dataAssinatura : undefined,
      observacoes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Marcar Advertência como Aplicada
          </DialogTitle>
          <DialogDescription>
            Registre que a advertência foi entregue ao motorista {conductorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Data de Aplicação */}
          <div className="space-y-2">
            <Label htmlFor="dataAplicacao">Data de Aplicação *</Label>
            <Input
              id="dataAplicacao"
              type="date"
              value={dataAplicacao}
              onChange={(e) => setDataAplicacao(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Data em que a advertência foi entregue ao motorista
            </p>
          </div>

          {/* Status de Assinatura */}
          <div className="space-y-2">
            <Label htmlFor="assinada">Advertência Assinada?</Label>
            <Select value={assinada} onValueChange={setAssinada}>
              <SelectTrigger id="assinada">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não (Pendente de Devolução)</SelectItem>
                <SelectItem value="sim">Sim (Já Devolvida Assinada)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Indique se o motorista já devolveu a advertência assinada
            </p>
          </div>

          {/* Data de Assinatura (condicional) */}
          {assinada === "sim" && (
            <div className="space-y-2">
              <Label htmlFor="dataAssinatura">Data de Devolução Assinada</Label>
              <Input
                id="dataAssinatura"
                type="date"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Data em que o motorista devolveu a advertência assinada
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (Opcional)</Label>
            <textarea
              id="observacoes"
              className="w-full px-3 py-2 text-sm border rounded-md border-input bg-background"
              placeholder="Ex: Motorista reclamou da advertência, foi necessário explicar..."
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Fluxo de Advertência:</p>
              <p className="text-xs mt-1">
                1. Registre aqui que foi aplicada → 2. Aguarde devolução assinada → 3. Marque como assinada
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={markAppliedMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {markAppliedMutation.isPending ? "Salvando..." : "Confirmar Aplicação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
