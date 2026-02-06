import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function InfractionTypes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });

  // Buscar tipos de infração
  const { data: types, refetch } = trpc.dashboard.getInfractionTypes.useQuery();

  // Criar novo tipo
  const createMutation = trpc.dashboard.createInfractionType.useMutation({
    onSuccess: () => {
      toast.success("Tipo de infração criado com sucesso");
      setDialogOpen(false);
      setFormData({ nome: "", descricao: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Atualizar tipo
  const updateMutation = trpc.dashboard.updateInfractionType.useMutation({
    onSuccess: () => {
      toast.success("Tipo de infração atualizado com sucesso");
      setDialogOpen(false);
      setEditingId(null);
      setFormData({ nome: "", descricao: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Deletar tipo
  const deleteMutation = trpc.dashboard.deleteInfractionType.useMutation({
    onSuccess: () => {
      toast.success("Tipo de infração deletado com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        nome: formData.nome,
        descricao: formData.descricao,
        ativo: true,
      });
    } else {
      createMutation.mutate({
        nome: formData.nome,
        descricao: formData.descricao,
      });
    }
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setFormData({ nome: type.nome, descricao: type.descricao || "" });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este tipo de infração?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenDialog = () => {
    setEditingId(null);
    setFormData({ nome: "", descricao: "" });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tipos de Infração</h1>
          <p className="text-slate-600 mt-2">
            Gerencie os tipos de infração disponíveis no sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Tipo de Infração" : "Novo Tipo de Infração"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Nome: *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Pouco Rodado"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Descrição:
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Descrição do tipo de infração"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            {types?.length || 0} tipo(s) de infração cadastrado(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {types && types.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.nome}</TableCell>
                      <TableCell className="text-slate-600">
                        {type.descricao || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(type.criadoEm).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(type)}
                            className="gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(type.id)}
                            className="gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Deletar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Nenhum tipo de infração cadastrado. Clique em "Novo Tipo" para criar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Informações</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>
            • Os tipos de infração são usados para categorizar advertências e orientações
          </p>
          <p>
            • Você pode criar tipos personalizados de acordo com as necessidades da sua operação
          </p>
          <p>
            • Tipos deletados não aparecem mais, mas dados históricos são preservados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
