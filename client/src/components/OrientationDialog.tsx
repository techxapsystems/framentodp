import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface OrientationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motorista: { name: string; placa: string } | null;
  onSuccess?: () => void;
}

export function OrientationDialog({ open, onOpenChange, motorista, onSuccess }: OrientationDialogProps) {
  const [tipo, setTipo] = useState<"pouco_rodado" | "horas_extras">("pouco_rodado");
  const [motivo, setMotivo] = useState("");

  const countOrientationsQuery = trpc.dashboard.countOrientations.useQuery(
    motorista ? { conductorName: motorista.name, tipo } : null,
    { enabled: !!motorista }
  );

  const createOrientationMutation = trpc.dashboard.createOrientation.useMutation({
    onSuccess: () => {
      // Refetch o contador após sucesso
      countOrientationsQuery.refetch();
    },
  });

  const handleRegister = async () => {
    if (!motorista || !motivo.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const result = await createOrientationMutation.mutateAsync({
        conductorName: motorista.name,
        tipo,
        motivo,
      });

      // Aguardar um pouco para a query ser refetchada
      await new Promise(resolve => setTimeout(resolve, 500));
      const count = (countOrientationsQuery.data || 0) + 1;

      if (count === 3) {
      toast.success(`Orientação registrada! Advertência Aviso 1 foi gerada automaticamente após 3 orientações.`);
      } else {
        toast.success(`Orientação ${count} de 3 registrada. ${3 - count} orientações faltam para gerar advertência.`);
      }

      setMotivo("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Orientação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Motorista</Label>
            <Input value={motorista?.name || ""} disabled />
          </div>

          <div>
            <Label>Placa</Label>
            <Input value={motorista?.placa || ""} disabled />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "pouco_rodado" | "horas_extras")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pouco_rodado">Pouco Rodado</SelectItem>
                <SelectItem value="horas_extras">Horas Extras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo da orientação..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {countOrientationsQuery.data !== undefined && (
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p>
                <strong>Orientações registradas:</strong> {countOrientationsQuery.data} de 3
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {countOrientationsQuery.data < 3
                  ? `Faltam ${3 - countOrientationsQuery.data} orientações para gerar uma Advertência (Aviso 1)`
                  : "Próxima orientação gerará uma Advertência"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleRegister} disabled={createOrientationMutation.isPending}>
            {createOrientationMutation.isPending ? "Registrando..." : "Registrar Orientação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
