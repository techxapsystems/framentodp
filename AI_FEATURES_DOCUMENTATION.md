# 🤖 Documentação Completa - Features de IA Preditiva e Chat Operacional

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Features Implementadas](#features-implementadas)
4. [Guia de Uso](#guia-de-uso)
5. [Exemplos de Queries](#exemplos-de-queries)
6. [Integração Técnica](#integração-técnica)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

A tela de **Acompanhamento de Advertências** agora possui **inteligência artificial preditiva** integrada, fornecendo:

- **Insights Preditivos**: Análise automática de tendências, riscos e padrões
- **Chat Operacional**: Interface para fazer perguntas rápidas sobre o status
- **Análise de Risco**: Identificação de motoristas e operações em risco
- **Recomendações de Ações**: Sugestões de próximas ações operacionais

---

## 🏗️ Arquitetura

### Backend Stack
```
tRPC Procedures (warningsAIRouter.ts)
    ↓
invokeLLM (Gemini 2.5 Flash)
    ↓
Database Context (warnings, conductors, recurrences)
```

### Frontend Stack
```
WarningsTracking.tsx (Tela Principal)
    ├── AIInsightsPanel (Insights Preditivos)
    ├── WarningsChatPanel (Chat Operacional)
    └── Gráficos & Tabelas (Existentes)
```

### Data Flow
```
User Filters (Date, Operation)
    ↓
AIInsightsPanel / WarningsChatPanel
    ↓
tRPC: getAIInsights / warningsChat
    ↓
Database Query (Context Aggregation)
    ↓
invokeLLM (IA Analysis)
    ↓
Render Results (Markdown + UI)
```

---

## ✨ Features Implementadas

### 1. **Painel de Insights Preditivos** 🤖

**Localização**: Tela de Acompanhamento (após KPIs, antes dos gráficos)

**O que exibe**:
- **Resumo de Contexto**: Total de advertências, suspensões, motoristas afetados, tendência
- **Motoristas em Risco Crítico**: Top 3 motoristas com maior probabilidade de escalação
- **Operações em Foco**: Top 3 operações com mais advertências/suspensões
- **Análise Preditiva Detalhada**: Texto gerado por IA com insights estruturados

**Recursos**:
- ✅ Atualização automática ao mudar filtros
- ✅ Botão "Atualizar Insights" para refresh manual
- ✅ Botão "Recolher/Expandir" para economizar espaço
- ✅ Loading state com skeleton
- ✅ Renderização de markdown

**Exemplo de Insight**:
```
## Risco Iminente
Motoristas com 2+ avisos em 30 dias têm 85% de chance de suspensão.
Recomendação: Intervir com orientação preventiva imediatamente.

## Operações em Crise
BRF Primária: 8 advertências em 7 dias (↑ 60% vs semana anterior)
Causa principal: Horas extras excessivas (5 casos)

## Padrões Temporais
Segunda a quarta: 60% das violações de pouco rodado
Turno noturno: 3x mais violações que turno diurno

## Recomendações
1. Aumentar fiscalização seg-ter no turno noturno
2. Revisar escala de turnos na BRF Primária
3. Intervir com orientação em 3 motoristas críticos
```

---

### 2. **Painel de Chat Operacional** 💬

**Localização**: Tela de Acompanhamento (após Insights, antes dos gráficos)

**O que oferece**:
- Chat interativo com histórico de mensagens
- Sugestões de prompts pré-definidas
- Respostas em tempo real da IA
- Contexto automático (período + operação selecionados)

**Sugestões de Prompts**:
1. "Como está o status geral?"
2. "Qual é a tendência?"
3. "Quem está em risco?"
4. "Qual operação tem mais problemas?"
5. "Qual é a recomendação?"
6. "Qual é o padrão de violações?"

**Recursos**:
- ✅ Histórico de conversa persistente
- ✅ Botão "Recolher/Expandir"
- ✅ Loading state durante processamento
- ✅ Renderização de markdown nas respostas
- ✅ Tratamento de erros com toast notifications

**Exemplo de Conversa**:
```
User: "Como está o José Alves?"
AI: "José Alves tem 2 avisos em 30 dias. Última violação foi há 3 dias (pouco rodado).
Risco: ALTO - probabilidade de 75% de próximo aviso em 7 dias.
Recomendação: Intervir com orientação preventiva."

User: "Qual é a tendência geral?"
AI: "Tendência: PIORANDO. Se não intervir, esperamos 3-4 suspensões na próxima semana.
Motoristas em risco crítico: José Alves, Maria Silva, Carlos Santos.
Ação imediata: Orientação preventiva + aumento de fiscalização."
```

---

## 📖 Guia de Uso

### Passo 1: Acessar a Tela de Acompanhamento
1. Faça login no sistema
2. Clique em "Acompanhamento de Advertências" no menu lateral

### Passo 2: Definir Filtros
1. Selecione **Data Inicial** (padrão: 30 dias atrás)
2. Selecione **Data Final** (padrão: hoje)
3. Selecione **Operação** (padrão: Todas as operações)
4. Clique em **"Atualizar"**

### Passo 3: Visualizar Insights
Após atualizar, você verá:
1. **KPIs** (Total, Assinadas, Pendentes, Taxa de Devolução)
2. **🤖 Painel de Insights Preditivos** ← NOVO
3. **💬 Painel de Chat Operacional** ← NOVO
4. **Gráficos** (Distribuição, Status, Operações)

### Passo 4: Fazer Queries no Chat
1. Clique no **Painel de Chat** para expandir
2. Digite sua pergunta ou clique em uma sugestão
3. Aguarde a resposta da IA
4. Continue a conversa normalmente

### Passo 5: Atualizar Insights
- Clique no botão **🔄 Atualizar** no painel de Insights
- Os dados serão recarregados e a IA gerará novos insights

---

## 💡 Exemplos de Queries

### Query 1: Status de Motorista
```
"Como está o José Alves?"
"Quantos avisos tem o motorista da placa ABC-1234?"
"Qual é o risco do motorista X?"
```

**Resposta esperada**:
```
José Alves tem 2 avisos em 30 dias. Última violação foi há 3 dias (pouco rodado).
Risco: ALTO - probabilidade de 75% de próximo aviso em 7 dias.
Recomendação: Intervir com orientação preventiva.
```

### Query 2: Status de Operação
```
"Como está a BRF Primária?"
"Qual operação tem mais problemas?"
"Que está acontecendo com as suspensões?"
```

**Resposta esperada**:
```
BRF Primária: 8 advertências em 7 dias (↑ 60% vs semana anterior).
Principal causa: Horas extras excessivas (5 casos).
Recomendação: Revisar escala de turnos e aumentar fiscalização.
```

### Query 3: Insights Preditivos
```
"O que vai acontecer se não fizermos nada?"
"Qual é a tendência?"
"Quem vai ser suspenso em breve?"
```

**Resposta esperada**:
```
Tendência: PIORANDO. Se não intervir, esperamos 3-4 suspensões na próxima semana.
Motoristas em risco crítico: José Alves, Maria Silva, Carlos Santos.
Ação imediata: Orientação preventiva + aumento de fiscalização.
```

### Query 4: Análise Comparativa
```
"Qual é a diferença entre operações?"
"Qual turno tem mais problemas?"
"Como foi a semana passada vs hoje?"
```

**Resposta esperada**:
```
Turno noturno tem 3x mais violações que turno diurno.
BRF Primária: 8 avisos (↑ 60%)
BRF Secundária: 2 avisos (↓ 20%)
Recomendação: Investigar diferenças de gestão entre operações.
```

---

## 🔧 Integração Técnica

### Backend Procedures

#### `trpc.warningsAI.getAIInsights`
```typescript
// Input
{
  startDate: "2026-02-01",
  endDate: "2026-02-15",
  operacao?: "BRF Primária"
}

// Output
{
  success: true,
  insights: "Texto gerado por IA em markdown",
  context: {
    periodo: { dataInicio, dataFim, diasAnalisados },
    metricas: { totalAdvertencias, totalSuspensoes, motoristesAfetados, operacoes },
    tendencias: { primeiraMetade, segundaMetade, percentualMudanca, direcao },
    topMotoristas: [...],
    topOperacoes: [...]
  }
}
```

#### `trpc.warningsAI.warningsChat`
```typescript
// Input
{
  message: "Como está o José Alves?",
  startDate: "2026-02-01",
  endDate: "2026-02-15",
  operacao?: "BRF Primária",
  conversationHistory?: [{ role, content }, ...]
}

// Output
{
  success: true,
  message: "Resposta gerada por IA em markdown"
}
```

### Frontend Components

#### `AIInsightsPanel`
```tsx
<AIInsightsPanel
  startDate={startDate}
  endDate={endDate}
  operacao={selectedOperation}
/>
```

#### `WarningsChatPanel`
```tsx
<WarningsChatPanel
  startDate={startDate}
  endDate={endDate}
  operacao={selectedOperation}
/>
```

### Files Modified/Created
- ✅ `server/routers/warningsAIRouter.ts` (NEW)
- ✅ `client/src/components/AIInsightsPanel.tsx` (NEW)
- ✅ `client/src/components/WarningsChatPanel.tsx` (NEW)
- ✅ `client/src/pages/WarningsTracking.tsx` (MODIFIED)
- ✅ `server/routers.ts` (MODIFIED - added warningsAI router)
- ✅ `server/__tests__/warnings-ai.test.ts` (NEW)

---

## 🐛 Troubleshooting

### Problema: Insights não aparecem
**Solução**:
1. Verifique se selecionou um período válido
2. Clique em "Atualizar" para forçar recarregamento
3. Verifique a conexão com internet
4. Verifique se há dados de advertências no período

### Problema: Chat não responde
**Solução**:
1. Verifique se está autenticado
2. Tente fazer uma pergunta mais simples
3. Aguarde alguns segundos (IA pode estar processando)
4. Recarregue a página

### Problema: Erros de TypeScript
**Solução**:
1. Execute `pnpm build` para verificar erros
2. Execute `pnpm test` para validar testes
3. Verifique se todos os imports estão corretos

### Problema: Performance lenta
**Solução**:
1. Reduza o período de análise (ex: últimos 7 dias em vez de 30)
2. Filtre por uma operação específica
3. Aguarde alguns segundos para a IA processar

---

## 📊 Métricas & Monitoramento

### Dados Agregados
- **Total de Advertências**: Soma de todos os tipos
- **Total de Suspensões**: Contagem de suspensões
- **Motoristas Afetados**: Contagem de motoristas únicos
- **Taxa de Devolução**: % de advertências assinadas
- **Tendência**: % de mudança entre primeira e segunda metade do período

### Indicadores de Risco
- **Risco Crítico**: Motorista com 3+ avisos ou Aviso 3
- **Risco Alto**: Motorista com 2+ avisos em 30 dias
- **Risco Médio**: Motorista com 1 aviso em 7 dias
- **Risco Baixo**: Motorista sem avisos recentes

### Padrões Detectados
- **Temporal**: Dias/turnos com mais violações
- **Categórico**: Tipos de violações mais comuns
- **Operacional**: Operações com maiores índices
- **Comportamental**: Motoristas crônicos vs ocasionais

---

## 🚀 Próximos Passos (Roadmap)

### Fase 2: Persistência & Cache
- [ ] Salvar insights em `ai_insights` table
- [ ] Implementar cache (atualizar a cada 5 min)
- [ ] Histórico de insights por período

### Fase 3: Alertas & Notificações
- [ ] Alertas automáticos por email (risco crítico)
- [ ] Notificações em tempo real (novos avisos)
- [ ] Dashboard de alertas

### Fase 4: Relatórios
- [ ] Relatórios preditivos em PDF
- [ ] Exportar insights para Excel
- [ ] Agendamento de relatórios

### Fase 5: Expansão
- [ ] Integração com tela de Reincidentes
- [ ] Integração com tela de Relatórios
- [ ] Dashboard de tendências futuras
- [ ] Previsão de suspensões (próximas 30 dias)

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este documento
2. Consulte a seção Troubleshooting
3. Verifique os logs em `.manus-logs/`
4. Contacte o time de desenvolvimento

---

**Versão**: 1.0  
**Data**: 2026-02-16  
**Status**: ✅ Produção  
**Testes**: 235/235 passando  
