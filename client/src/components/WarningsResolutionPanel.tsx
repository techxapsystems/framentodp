import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WarningsResolutionPanelProps {
  startDate?: string;
  endDate?: string;
}

type ChatMessage = Omit<Message, 'role'> & { role: 'user' | 'assistant' };

export function WarningsResolutionPanel({ startDate, endDate }: WarningsResolutionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);

  // Mutation para resolver advertências
  const { mutate: resolveWarnings, isPending: isResolving } = trpc.warningsResolution.resolveWarnings.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setResolvedCount(data.resolved);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `✅ ${data.message}\n\n**Detalhes:**\n- Motoristas: ${data.drivers?.join(", ")}\n- Resolvido por: ${data.resolvedBy}\n- Hora: ${data.resolvedAt ? new Date(data.resolvedAt).toLocaleString('pt-BR') : 'N/A'}`,
          },
        ]);
        setInputText("");
        setValidationErrors([]);
        toast.success(data.message);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `⚠️ ${data.message}`,
          },
        ]);
        toast.warning(data.message);
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

  // Query para validar nomes
  const { mutate: validateNames } = trpc.warningsResolution.validateDriverNames.useMutation({
    onSuccess: (data) => {
      setValidationErrors(data.errors);
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error("Erros na validação de nomes");
      }
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

      // Extrair nomes do comando
      // Formato esperado: "Dar baixa em NELIO MARQUES, JOAB JOSE DA SILVA"
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes("dar baixa") || lowerMsg.includes("resolver") || lowerMsg.includes("resolvidas")) {
        // Extrair nomes após "em" ou ":"
        const match = message.match(/(?:em|:)\s*(.+?)(?:\.|$)/i);
        if (match) {
          const namesStr = match[1];
          const names = namesStr
            .split(/[,;]/)
            .map((n) => n.trim())
            .filter((n) => n.length > 0);

          if (names.length > 0) {
            // Validar primeiro
            validateNames(
              { names },
              {
                onSuccess: (validation: any) => {
                  if (validation.valid) {
                    // Se válido, resolver
                    resolveWarnings({
                      driverNames: names,
                      reason: message,
                      startDate,
                      endDate,
                    });
                  } else {
                    // Mostrar erros
                    const errorMsg = validation.errors.join("\n");
                    setMessages((prev) => [
                      ...prev,
                      {
                        role: "assistant" as const,
                        content: `❌ Validação falhou:\n${errorMsg}\n\n**Dica:** Use nomes completos (ex: "JOAO SILVA", não apenas "JOAO")`,
                      },
                    ]);
                  }
                },
              }
            );
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant" as const,
                content: `❌ Nenhum nome encontrado. Use o formato:\n"Dar baixa em NELIO MARQUES, JOAB JOSE DA SILVA"`,
              },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: `❌ Nenhum nome encontrado. Use o formato:\n"Dar baixa em NELIO MARQUES, JOAB JOSE DA SILVA"`,
            },
          ]);
        }
      } else {
        // Mensagem informativa
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `💡 Use o comando:\n"Dar baixa em NOME COMPLETO, OUTRO NOME"\n\nExemplo:\n"Dar baixa em NELIO MARQUES, JOAB JOSE DA SILVA"`,
          },
        ]);
      }
    },
    [resolveWarnings, validateNames]
  );

  const suggestedPrompts = [
    "Dar baixa em NELIO MARQUES",
    "Resolver advertências de JOAB JOSE DA SILVA",
    "Dar baixa em MARIA SILVA, CARLOS SANTOS",
  ];

  return (
    <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base">Dar Baixa em Advertências</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Resolva advertências com auditoria completa de segurança
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Instruções */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200/50">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Como usar:</p>
                <p>Digite: "Dar baixa em NOME COMPLETO, OUTRO NOME"</p>
                <p className="text-blue-700 mt-1">⚠️ Use nomes completos para evitar erros</p>
              </div>
            </div>
          </div>

          {/* Chat */}
          <AIChatBox
            messages={messages as Message[]}
            onSendMessage={handleSendMessage}
            isLoading={isResolving}
            placeholder="Ex: Dar baixa em NELIO MARQUES, JOAB JOSE DA SILVA"
            height="h-80"
            suggestedPrompts={suggestedPrompts}
            emptyStateMessage="Digite um comando para dar baixa em advertências"
            className=""
          />

          {/* Erros de Validação */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200/50">
              <p className="text-xs font-semibold text-red-900 mb-2">Erros encontrados:</p>
              <ul className="text-xs text-red-800 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Status */}
          {resolvedCount > 0 && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200/50">
              <p className="text-xs text-green-800">
                <span className="font-semibold">✅ Última ação:</span> {resolvedCount} advertência(s) resolvida(s)
              </p>
            </div>
          )}

          {/* Rodapé */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            <p>🔒 Todas as ações são registradas para auditoria</p>
            <p className="text-green-600 font-medium">Usuário logado registra a ação, não a IA</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
