import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  { id: "controle_de_advertencias", label: "Controle de Advertências" },
  { id: "banco_de_horas", label: "Banco de Horas" },
  { id: "operacional_jornada", label: "Operacional Jornada" },
];

function generateTemporaryPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function UserManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as "user" | "admin" | "gestor",
    department: "",
    modules: [] as string[],
    status: "ativo" as "ativo" | "inativo",
    password: "",
  });

  const { data: users = [] } = trpc.users.listUsers.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.users.createUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso");
      utils.users.listUsers.invalidate();
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso");
      utils.users.listUsers.invalidate();
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.users.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário deletado com sucesso");
      utils.users.listUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const toggleStatusMutation = trpc.users.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      utils.users.listUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      department: "",
      modules: [],
      status: "ativo",
      password: "",
    });
    setEditingId(null);
  };

  const handleEdit = (user: any) => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      department: user.department || "",
      modules: user.modules || [],
      status: user.status,
      password: user.password || "",
    });
    setEditingId(user.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.department) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Gerar senha temporária se for novo usuário
    const dataToSave = {
      ...formData,
      password: editingId ? formData.password : generateTemporaryPassword(),
    };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...dataToSave,
      });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar este usuário?")) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleModule = (moduleId: string) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter((m) => m !== moduleId)
        : [...prev.modules, moduleId],
    }));
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Gerenciamento de Usuários
        </h1>
        <p className="text-slate-600 mt-2">
          Crie, edite e gerencie os usuários do sistema
        </p>
      </div>

      {/* Botão Nova Usuário */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              size="lg"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Nome: *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Usuário (Login) */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Usuário (Login): *
                </label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="nome.sobrenome"
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {/* Departamento */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Departamento: *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  placeholder="Ex: Operações, Administrativo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Função: *
                </label>
                <Select value={formData.role} onValueChange={(v: any) => setFormData((prev) => ({ ...prev, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Status: *
                </label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData((prev) => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Senha Temporária */}
              {!editingId && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Senha Temporária (gerada automaticamente):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.password}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          password: generateTemporaryPassword(),
                        }))
                      }
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium"
                    >
                      Gerar Nova
                    </button>
                  </div>
                </div>
              )}

              {/* Módulos */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Módulos de Acesso:
                </label>
                <div className="space-y-2">
                  {MODULES.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.modules.includes(module.id)}
                        onChange={() => toggleModule(module.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">
                        {module.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : "Salvar"}
                </Button>
                <Button
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Usuário
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Função
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Departamento
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhum usuário cadastrado
                    </td>
                  </tr>
                ) : (
                  users.map((user: any) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 text-slate-600">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {user.role === "admin"
                            ? "Admin"
                            : user.role === "gestor"
                            ? "Gestor"
                            : "Usuário"}
                        </span>
                      </td>
                      <td className="py-3 px-4">{user.department}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            user.status === "ativo"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-600"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: user.id })
                            }
                            className="p-1 hover:bg-yellow-100 rounded text-yellow-600"
                            title={
                              user.status === "ativo"
                                ? "Desativar"
                                : "Ativar"
                            }
                          >
                            {user.status === "ativo" ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Deletar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
