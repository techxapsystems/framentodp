'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, MessageCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WarningsResolutionPanelProps {
  startDate?: string;
  endDate?: string;
}

interface PendingWarning {
  id: number;
  tipo: string;
  nivel: number;
  categoria: string;
  data: string;
  dataCompleta: string;
  status: string;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function WarningsResolutionPanel({ startDate, endDate }: WarningsResolutionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [currentDriver, setCurrentDriver] = useState<string>("");
  const [pendencies, setPendencies] = useState<PendingWarning[]>([]);
  const [selectedWarnings, setSelectedWarnings] = useState<Set<number>>(new Set());
  const [showPendencies, setShowPendencies] = useState(false);

  // Query para buscar pendências de um motorista
  const { mutate: getDriverPendencies, isPending: isFetchingPendencies } = trpc.warningsResolution.getDriverPendencies.useMutation({
    onSuccess: (data: any) => {
      if (data.found) {
        setPendencies(data.pendencies);
        setCurrentDriver(data.driverName);
        setShowPendencies(true);
        setSelectedWarnings(new Set());
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `✅ ${data.message}\n\nSelecione as advertências que deseja dar baixa usando os checkboxes abaixo.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `⚠️ ${data.message}`,
          },
        ]);
        toast.warning(data.message);
        setShowPendencies(false);
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.message || "Erro ao buscar pendências";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `❌ Erro: ${errorMsg}`,
        },
      ]);
      toast.error(errorMsg);
      setShowPendencies(false);
    },
  });

  // Mutation para resolver advertências selecionadas
  const { mutate: resolveWarningsById, isPending: isResolving } = trpc.warningsResolution.resolveWarningsById.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        setResolvedCount(data.resolved);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `✅ ${data.message}\n\n**Detalhes:**\n- Motorista: ${data.driverName}\n- Quantidade: ${data.resolved}\n- Resolvido por: ${data.resolvedBy}\n- Hora: ${data.resolvedAt ? new Date(data.resolvedAt).toLocaleString('pt-BR') : 'N/A'}`,
          },
        ]);
        setInputText("");
        setValidationErrors([]);
        setShowPendencies(false);
        setPendencies([]);
        setSelectedWarnings(new Set());
        setCurrentDriver("");
        toast.success(data.message);
      }
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao resolver advertências";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `❌ Erro: ${errorMsg}`,
        },
      ]);
      toast.error(errorMsg);
    },
  });

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      // Adicionar mensagem do usuário
      setMessages((prev) => [
        ...prev,
        {
          role: "user" as const,
          content: message,
        },
      ]);

      // Verificar se é comando de dar baixa
      if (message.toLowerCase().includes("dar baixa") || message.toLowerCase().includes("baixa")) {
        // Extrair nomes (tudo após "em")
        const match = message.match(/(?:em|de)\s+(.+)/i);
        if (match) {
          const namesText = match[1];
          const names = namesText
            .split(",")
            .map((n) => n.trim())
            .filter((n) => n.length > 0);

          if (names.length > 0) {
            // Buscar pendências do primeiro motorista
            getDriverPendencies({ driverName: names[0] });
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant" as const,
                content: "❌ Nenhum nome foi extraído. Use: 'Dar baixa em NOME COMPLETO'",
              },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: "❌ Formato inválido. Use: 'Dar baixa em NOME COMPLETO'",
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: "💡 Use o comando: 'Dar baixa em NOME COMPLETO' para começar.",
          },
        ]);
      }

      setInputText("");
    },
    [getDriverPendencies]
  );

  const toggleWarningSelection = (warningId: number) => {
    const newSelected = new Set(selectedWarnings);
    if (newSelected.has(warningId)) {
      newSelected.delete(warningId);
    } else {
      newSelected.add(warningId);
    }
    setSelectedWarnings(newSelected);
  };

  const handleConfirmResolution = () => {
    if (selectedWarnings.size === 0) {
      toast.error("Selecione pelo menos uma advertência");
      return;
    }

    const warningIds = Array.from(selectedWarnings);
    resolveWarningsById({
      warningIds,
      driverName: currentDriver,
      reason: "Dar baixa via chat",
    });
  };

  const handleCancelSelection = () => {
    setShowPendencies(false);
    setPendencies([]);
    setSelectedWarnings(new Set());
    setCurrentDriver("");
  };

  const getWarningTypeLabel = (tipo: string) => {
    return tipo === "advertencia" ? "Advertência" : "Suspensão";
  };

  const getWarningLevelLabel = (nivel: number) => {
    const labels: Record<number, string> = {
      1: "Aviso 1",
      2: "Aviso 2",
      3: "Aviso 3 (Crítico)",
    };
    return labels[nivel] || `Aviso ${nivel}`;
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle className="text-lg">💬 Dar Baixa em Advertências</CardTitle>
              <CardDescription>Chat com seleção segura de advertências</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Chat Messages */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-48 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>💡 Digite: "Dar baixa em NOME COMPLETO"</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite: Dar baixa em NOME COMPLETO"
              className="resize-none h-12"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }
              }}
            />
            <Button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isFetchingPendencies}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Enviar
            </Button>
          </div>

          {/* Pendências Table */}
          {showPendencies && pendencies.length > 0 && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  📋 Selecione as advertências para dar baixa:
                </p>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedWarnings.size === pendencies.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedWarnings(new Set(pendencies.map(p => p.id)));
                            } else {
                              setSelectedWarnings(new Set());
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendencies.map((warning) => (
                      <TableRow key={warning.id} className="hover:bg-gray-50">
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedWarnings.has(warning.id)}
                            onChange={() => toggleWarningSelection(warning.id)}
                            className="w-4 h-4"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {warning.data}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={warning.tipo === "advertencia" ? "default" : "destructive"}
                          >
                            {getWarningTypeLabel(warning.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getWarningLevelLabel(warning.nivel)}</TableCell>
                        <TableCell className="text-sm">{warning.categoria}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{warning.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelSelection}
                  disabled={isResolving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmResolution}
                  disabled={selectedWarnings.size === 0 || isResolving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isResolving ? "Processando..." : `Confirmar (${selectedWarnings.size})`}
                </Button>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              {validationErrors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-700">
                  ❌ {error}
                </p>
              ))}
            </div>
          )}

          {/* Success Summary */}
          {resolvedCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">Sucesso!</p>
                <p className="text-sm text-green-700">
                  {resolvedCount} advertência(s) resolvida(s) com sucesso
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
