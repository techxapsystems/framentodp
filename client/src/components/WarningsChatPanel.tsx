import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface WarningsChatPanelProps {
  startDate: string;
  endDate: string;
  operacao?: string;
}

type ChatMessage = Omit<Message, 'role'> & { role: 'user' | 'assistant' };

export function WarningsChatPanel({ startDate, endDate, operacao }: WarningsChatPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Mutation para chat
  const { mutate: sendMessage, isPending: isChatLoading } = trpc.warningsAI.warningsChat.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: typeof data.message === 'string' ? data.message : JSON.stringify(data.message),
          },
        ]);
      }
    },
    onError: (error) => {
      toast.error("Erro ao processar pergunta");
      console.error("Chat error:", error);
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

      // Enviar para IA
      sendMessage({
        message,
        startDate,
        endDate,
        operacao,
        conversationHistory: messages,
      });
    },
    [messages, startDate, endDate, operacao, sendMessage]
  );

  const suggestedPrompts = [
    "Como está o status geral?",
    "Qual é a tendência?",
    "Quem está em risco?",
    "Qual operação tem mais problemas?",
    "Qual é a recomendação?",
    "Qual é o padrão de violações?",
  ];

  if (!startDate || !endDate) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">Chat Operacional</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Faça perguntas sobre advertências e operações
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <AIChatBox
            messages={messages as Message[]}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            placeholder="Faça uma pergunta sobre advertências..."
            height="h-96"
            suggestedPrompts={suggestedPrompts}
            emptyStateMessage="Comece fazendo uma pergunta sobre o status operacional"
          />
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Período: {startDate} a {endDate}
            {operacao && ` • Operação: ${operacao}`}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
