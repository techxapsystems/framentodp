import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Search } from "lucide-react";
import { toast } from "sonner";

export default function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"advertencia" | "suspensao">("advertencia");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Buscar categorias
  const { data: categories, isLoading: loadingCategories } = trpc.templates.getCategories.useQuery({
    type: selectedType,
  });

  // Buscar modelos populares
  const { data: popularTemplates } = trpc.templates.getPopularTemplates.useQuery({
    limit: 10,
    type: selectedType,
  });

  // Buscar modelos por categoria
  const { data: categoryTemplates, isLoading: loadingCategory } = trpc.templates.getTemplatesByCategory.useQuery(
    { categoryId: selectedCategoryId! },
    { enabled: !!selectedCategoryId }
  );

  // Buscar modelos por texto
  const { data: searchResults, isLoading: loadingSearch } = trpc.templates.searchTemplates.useQuery(
    { query: searchQuery, type: selectedType },
    { enabled: searchQuery.length >= 2 }
  );

  // Registrar uso de modelo
  const recordUsage = trpc.templates.recordUsage.useMutation();

  const handleCopyTemplate = async (template: any) => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      
      // Registrar uso
      recordUsage.mutate({ templateId: template.id });
      
      toast.success("Modelo copiado para a área de transferência!");
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar modelo");
    }
  };

  const getTypeLabel = (type: string) => (
    <Badge variant={type === "advertencia" ? "default" : "destructive"}>
      {type === "advertencia" ? "Advertência" : "Suspensão"}
    </Badge>
  );

  const displayTemplates = searchQuery.length >= 2 ? searchResults : categoryTemplates || popularTemplates || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Biblioteca de Modelos</h1>
        <p className="text-gray-600">
          Acesse modelos pré-configurados de advertências e suspensões. Copie o texto e cole no campo de advertência.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={selectedType} onValueChange={(value: any) => {
                setSelectedType(value);
                setSelectedCategoryId(null);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertencia">Advertências</SelectItem>
                  <SelectItem value="suspensao">Suspensões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select 
                value={selectedCategoryId?.toString() || ""} 
                onValueChange={(value) => setSelectedCategoryId(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Busca */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Digite palavras-chave para buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de Visualização */}
      <Tabs defaultValue="modelos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="modelos" className="space-y-4">
          {loadingCategories || loadingCategory || loadingSearch ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Carregando modelos...</p>
            </div>
          ) : displayTemplates && displayTemplates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {displayTemplates.map((template: any) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription>{template.summary}</CardDescription>
                      </div>
                      {getTypeLabel(template.type)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Preview do conteúdo */}
                    <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {template.content.substring(0, 300)}
                        {template.content.length > 300 ? "..." : ""}
                      </p>
                    </div>

                    {/* Informações */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Categoria:</span>
                        <p className="font-medium">{template.category?.name || "Geral"}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Usado:</span>
                        <p className="font-medium">{template.usageCount || 0} vezes</p>
                      </div>
                    </div>

                    {/* Botão de Copiar */}
                    <Button
                      onClick={() => handleCopyTemplate(template)}
                      className="w-full"
                      variant={copiedId === template.id ? "default" : "outline"}
                    >
                      {copiedId === template.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Modelo
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">Nenhum modelo encontrado</p>
              <p className="text-sm text-gray-400">
                {searchQuery.length > 0
                  ? "Tente ajustar seus critérios de busca"
                  : "Selecione uma categoria para visualizar modelos"}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Como Usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">1. Selecione o Tipo</h3>
                <p className="text-gray-600">
                  Escolha entre "Advertências" ou "Suspensões" dependendo da medida disciplinar.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Escolha uma Categoria</h3>
                <p className="text-gray-600">
                  Selecione a categoria que melhor se encaixa na infração (ex: Excesso de Velocidade, Falta Injustificada).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Copie o Modelo</h3>
                <p className="text-gray-600">
                  Clique em "Copiar Modelo" para copiar o texto para sua área de transferência.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4. Cole no Cadastro</h3>
                <p className="text-gray-600">
                  Vá para "Cadastro de Advertências" e cole o texto no campo de descrição.
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-blue-900 text-xs">
                  💡 <strong>Dica:</strong> Os modelos mais usados aparecem no topo quando você não seleciona uma categoria.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
