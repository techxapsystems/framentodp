# 🤖 Mapeamento de Capacidades Preditivas & IA para Tela de Acompanhamento

## Objetivo Geral
Integrar **inteligência artificial preditiva** na tela de **Acompanhamento de Advertências** para fornecer insights futuros, identificar padrões de risco e permitir queries operacionais rápidas via chat.

---

## 📊 1. INSIGHTS PREDITIVOS DISPONÍVEIS

### 1.1 **Motoristas em Risco Iminente** 🚨
**O que prever:** Quais motoristas têm maior probabilidade de escalação de advertência nos próximos 7-30 dias.

**Dados disponíveis:**
- Histórico de advertências (tipo, nível, data)
- Reincidências em 7 e 30 dias (já calculadas em `recurrences`)
- Padrões de violações (pouco rodado, horas extras)
- Tempo desde última advertência

**Prompt para IA:**
```
Analisar padrões de escalação de advertências:
- Motoristas com 2+ avisos em 30 dias têm X% de chance de suspensão
- Motoristas com reincidência em <7 dias têm Y% de chance de próximo aviso
- Padrões de comportamento (reincidente vs ocasional)
```

**Output esperado:**
```json
{
  "riskLevel": "CRÍTICO|ALTO|MÉDIO|BAIXO",
  "probabilidadeProximoAviso": 0.85,
  "diasEstimados": 5,
  "recomendacao": "Intervir com orientação preventiva"
}
```

---

### 1.2 **Operações em Crise** 📉
**O que prever:** Quais operações têm tendência de piora em advertências/suspensões.

**Dados disponíveis:**
- Taxa de advertências por operação (últimos 7, 30 dias)
- Trending (aumentando ou diminuindo)
- Top motoristas problemáticos por operação
- Taxa de devolução (suspensões que voltam)

**Prompt para IA:**
```
Analisar tendências operacionais:
- Operação A: 5 advertências em 7 dias (↑ 40% vs semana anterior)
- Operação B: 2 suspensões em 30 dias (↓ 20% vs mês anterior)
- Identificar padrões: sazonal, específico de gestor, ou sistêmico?
```

**Output esperado:**
```json
{
  "operacao": "BRF Primária",
  "statusTendencia": "PIORANDO|ESTÁVEL|MELHORANDO",
  "percentualMudanca": -15,
  "principaisCausas": ["Horas extras excessivas", "Ociosidade"],
  "recomendacaoGestao": "Aumentar fiscalização em turnos noturnos"
}
```

---

### 1.3 **Padrões Temporais de Violações** ⏰
**O que prever:** Quando e onde ocorrem violações com maior frequência.

**Dados disponíveis:**
- Data/hora de cada jornada
- Tipo de violação (pouco rodado, horas extras)
- Dia da semana, turno, operação

**Prompt para IA:**
```
Analisar padrões temporais:
- Segunda a quarta: 60% das violações de pouco rodado
- Sexta a domingo: 75% das violações de horas extras
- Turno noturno: 3x mais violações que turno diurno
```

**Output esperado:**
```json
{
  "padraoTemporal": {
    "diasAltoRisco": ["segunda", "terça"],
    "turnosAltoRisco": ["noturno"],
    "percentualViolacoes": 65
  },
  "recomendacao": "Intensificar monitoramento seg-ter no turno noturno"
}
```

---

### 1.4 **Motoristas Crônicos vs Ocasionais** 🔄
**O que prever:** Quem é reincidente sistemático vs quem cometeu erro isolado.

**Dados disponíveis:**
- Histórico de advertências (datas, tipos, categorias)
- Intervalo entre violações
- Padrão de comportamento (consistente ou aleatório)

**Prompt para IA:**
```
Classificar motoristas:
- Motorista A: 8 avisos em 90 dias (padrão consistente) → CRÔNICO
- Motorista B: 1 aviso em 6 meses (isolado) → OCASIONAL
- Motorista C: 3 avisos em 2 semanas (escalação rápida) → CRÍTICO
```

**Output esperado:**
```json
{
  "motorista": "JOSÉ ALVES",
  "classificacao": "CRÔNICO|OCASIONAL|CRÍTICO",
  "confianca": 0.92,
  "recomendacao": "Requerer curso de reciclagem obrigatório"
}
```

---

### 1.5 **Próximas Ações Recomendadas** 💡
**O que prever:** Qual é a melhor ação operacional para cada situação.

**Dados disponíveis:**
- Nível atual de advertência
- Histórico de ações tomadas
- Resultado de ações anteriores
- Políticas da empresa

**Prompt para IA:**
```
Recomendar ações:
- Motorista com Aviso 1 + reincidência em 7 dias → Orientação + Aviso 2
- Motorista com Aviso 3 + nova violação → Suspensão
- Motorista com padrão de melhora → Reconhecimento/Redução de advertências
```

**Output esperado:**
```json
{
  "acaoRecomendada": "SUSPENSÃO|AVISO|ORIENTAÇÃO|RECONHECIMENTO",
  "urgencia": "IMEDIATA|HOJE|ESTA_SEMANA",
  "justificativa": "Terceira violação em 30 dias"
}
```

---

## 💬 2. CHAT OPERACIONAL COM IA

### 2.1 **Tipos de Queries Suportadas**

#### Query 1: Status de Motorista
```
"Como está o José Alves?"
"Quantos avisos tem o motorista da placa ABC-1234?"
"Qual é o risco do motorista X?"
```

**Resposta esperada:**
```
José Alves tem 2 avisos em 30 dias. Última violação foi há 3 dias (pouco rodado).
Risco: ALTO - probabilidade de 75% de próximo aviso em 7 dias.
Recomendação: Intervir com orientação preventiva.
```

#### Query 2: Status de Operação
```
"Como está a BRF Primária?"
"Qual operação tem mais problemas?"
"Que está acontecendo com as suspensões?"
```

**Resposta esperada:**
```
BRF Primária: 8 advertências em 7 dias (↑ 60% vs semana anterior).
Principal causa: Horas extras excessivas (5 casos).
Recomendação: Revisar escala de turnos e aumentar fiscalização.
```

#### Query 3: Insights Preditivos
```
"O que vai acontecer se não fizermos nada?"
"Qual é a tendência?"
"Quem vai ser suspenso em breve?"
```

**Resposta esperada:**
```
Tendência: Piorando. Se não intervir, esperamos 3-4 suspensões na próxima semana.
Motoristas em risco crítico: José Alves, Maria Silva, Carlos Santos.
Ação imediata: Orientação preventiva + aumento de fiscalização.
```

#### Query 4: Análise Comparativa
```
"Qual é a diferença entre operações?"
"Qual turno tem mais problemas?"
"Como foi a semana passada vs hoje?"
```

**Resposta esperada:**
```
Turno noturno tem 3x mais violações que turno diurno.
BRF Primária: 8 avisos (↑ 60%)
BRF Secundária: 2 avisos (↓ 20%)
Recomendação: Investigar diferenças de gestão entre operações.
```

---

## 🏗️ 3. ARQUITETURA DE IMPLEMENTAÇÃO

### 3.1 **Backend - tRPC Procedures**

#### Procedure 1: `getAIInsights`
```typescript
warningsAIInsights: protectedProcedure
  .input(z.object({
    startDate: z.string(),
    endDate: z.string(),
    operacao: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    // 1. Buscar dados agregados (warnings, recurrences, trends)
    // 2. Chamar invokeLLM com contexto
    // 3. Retornar insights estruturados
  })
```

#### Procedure 2: `warningsChat`
```typescript
warningsChat: protectedProcedure
  .input(z.object({
    message: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    operacao: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Buscar dados relevantes (warnings, drivers, operations)
    // 2. Montar contexto para IA
    // 3. Chamar invokeLLM com chat history
    // 4. Retornar resposta em markdown
  })
```

### 3.2 **Frontend - Componentes**

#### Componente 1: `AIInsightsPanel`
```tsx
<AIInsightsPanel
  startDate={startDate}
  endDate={endDate}
  operacao={selectedOperation}
/>
```

**Exibe:**
- Card com insights principais (risco iminente, operações em crise, padrões)
- Loading state com skeleton
- Botão "Atualizar Insights"

#### Componente 2: `AIChatBox` (já existe!)
```tsx
<AIChatBox
  messages={chatMessages}
  onSendMessage={handleChatMessage}
  isLoading={isChatLoading}
  placeholder="Faça uma pergunta sobre advertências..."
  suggestedPrompts={[
    "Como está o José Alves?",
    "Qual é a tendência?",
    "Quem vai ser suspenso?",
  ]}
/>
```

### 3.3 **Integração com Filtros Existentes**

Os filtros da tela de Acompanhamento (Data DE/ATÉ, Operação) serão usados como contexto:
- Quando usuário muda filtros → Atualizar insights
- Quando usuário envia chat → Incluir filtros no contexto da IA

---

## 📈 4. FLUXO DE DADOS

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: WarningsTracking.tsx                              │
│ - Filtros: startDate, endDate, selectedOperation            │
│ - Dados: stats, byOperation, warnings                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ AIInsightsPanel  │  │ AIChatBox        │
│ - Carrega insights│  │ - Envia queries  │
│ - Exibe tendências│  │ - Recebe respostas│
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ tRPC Procedures      │
         │ - getAIInsights      │
         │ - warningsChat       │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ invokeLLM (Gemini)   │
         │ - Análise de dados   │
         │ - Geração de insights│
         │ - Respostas de chat  │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Database             │
         │ - warnings           │
         │ - recurrences        │
         │ - suggestedActions   │
         │ - treatments         │
         └──────────────────────┘
```

---

## 🎯 5. PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Esta sessão)
- [ ] Criar `getAIInsights` procedure no backend
- [ ] Criar `warningsChat` procedure no backend
- [ ] Implementar `AIInsightsPanel` component
- [ ] Integrar `AIChatBox` na tela de Acompanhamento
- [ ] Testar com dados reais

### Fase 2: Refinamento
- [ ] Persistir insights em `ai_insights` table
- [ ] Implementar cache (atualizar a cada 5 min)
- [ ] Adicionar histórico de chat
- [ ] Melhorar prompts com feedback do usuário

### Fase 3: Expansão
- [ ] Alertas automáticos (email quando risco crítico)
- [ ] Relatórios preditivos em PDF
- [ ] Integração com outras telas (Reincidentes, Relatórios)
- [ ] Dashboard de tendências futuras

---

## 💾 6. DADOS NECESSÁRIOS PARA IA

### Contexto Agregado (para cada query)
```json
{
  "periodo": {
    "dataInicio": "2026-02-01",
    "dataFim": "2026-02-15",
    "diasAnalisados": 14
  },
  "metricas": {
    "totalAdvertencias": 12,
    "totalSuspensoes": 2,
    "motoristesAfetados": 8,
    "operacoes": ["BRF Primária", "BRF Secundária"]
  },
  "tendencias": {
    "advertenciasUltimasSemana": 8,
    "advertenciasSemanaPassa": 5,
    "percentualMudanca": 60,
    "direcao": "PIORANDO"
  },
  "topMotoristas": [
    {
      "nome": "JOSÉ ALVES",
      "avisos": 3,
      "categoria": "pouco_rodado",
      "risco": "CRÍTICO"
    }
  ],
  "topOperacoes": [
    {
      "nome": "BRF Primária",
      "advertencias": 10,
      "suspensoes": 1,
      "tendencia": "PIORANDO"
    }
  ]
}
```

---

## 🔐 7. CONSIDERAÇÕES DE SEGURANÇA & PERFORMANCE

- ✅ Usar `protectedProcedure` para todas as queries
- ✅ Respeitar filtros de operação (não mostrar dados de outras operações)
- ✅ Cache de insights (atualizar a cada 5 min, não em cada request)
- ✅ Limitar histórico de chat (últimas 10 mensagens)
- ✅ Validar inputs com Zod
- ✅ Tratar erros de IA gracefully (fallback para dados brutos)

---

## 📝 Próximos Passos

1. **Implementar `getAIInsights` procedure** - Buscar dados, chamar IA, retornar insights
2. **Implementar `warningsChat` procedure** - Manter histórico, chamar IA, retornar resposta
3. **Criar `AIInsightsPanel` component** - Exibir insights com cards bonitos
4. **Integrar `AIChatBox`** - Adicionar chat à tela de Acompanhamento
5. **Testar end-to-end** - Validar fluxo completo com dados reais
6. **Adicionar ao todo.md** - Marcar items como completos

---

**Status:** 🟡 Pronto para implementação
**Estimativa:** 4-6 horas (1 sessão)
**Risco:** Baixo (usando componentes existentes + padrão tRPC estabelecido)
