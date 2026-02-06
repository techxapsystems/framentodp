# Redesenho Completo do Fluxo de Advertências

## 🎯 Objetivo
Criar um fluxo prático, leve e eficiente para gestão de advertências com dashboards de acompanhamento, alertas de vencimento e relatórios.

---

## 📊 Fluxo Atual vs Desejado

### ❌ Problemas Identificados
1. **Sem visibilidade de prazos** - Usuário não sabe quando a advertência vence
2. **Sem alertas de vencimento** - Advertências vencidas não são destacadas
3. **Sem dashboard de acompanhamento** - Impossível ver status consolidado
4. **Sem relatórios** - Sem extração de dados por período/gestor/operação
5. **Tela desorganizada** - Muitas informações misturadas
6. **Sem filtros eficientes** - Difícil encontrar advertências específicas

### ✅ Solução Proposta

#### 1. **Tela de Cadastro (Simplificada)**
- Campos essenciais apenas
- Auto-preenchimento de operação/placa
- Botão "Registrar" simples
- Feedback visual imediato

#### 2. **Dashboard de Acompanhamento** (Nova Tela)
- **KPIs Principais:**
  - Total enviadas
  - Assinadas (verde)
  - Pendentes (amarelo)
  - Vencidas (vermelho - 4+ dias)
  
- **Filtros:**
  - Por período (últimos 7, 30, 90 dias)
  - Por operação
  - Por status (Pendente, Assinada, Vencida)
  - Por gestor

- **Tabela de Advertências:**
  - Motorista
  - Placa
  - Data de envio
  - Prazo (4 dias)
  - Status com badge colorida
  - Ações (Marcar como assinada, Editar, Visualizar)

#### 3. **Dashboard de Alertas** (Nova Tela)
- Apenas advertências VENCIDAS (vermelho)
- Listar motoristas que não devolveram
- Informações completas da advertência
- Botão para reenviar/lembrar
- Botão para marcar como assinada manualmente

#### 4. **Sistema de Relatórios** (Nova Tela)
- **Filtros:**
  - Período (data início/fim)
  - Gestor (quem criou)
  - Operação
  - Status
  
- **Opções de Exportação:**
  - PDF com tabela e gráficos
  - Excel com dados brutos
  - Resumo executivo

- **Dados no Relatório:**
  - Total de advertências
  - Taxa de devolução (%)
  - Tempo médio de devolução
  - Motoristas com mais advertências
  - Operações com mais advertências

---

## 🏗️ Arquitetura de Dados

### Tabela `warnings` (Atualizada)
```sql
- id
- motorista
- placa
- operacao
- tipo (advertencia/suspensao)
- motivo
- data_infração
- data_envio (NOW())
- data_prazo (NOW() + 4 dias)
- data_assinatura (NULL até assinar)
- status (pendente/assinada/vencida)
- gestor_id (quem criou)
- observacoes
```

---

## 🎨 Layout das Telas

### Tela 1: Cadastro (Simplificada)
```
┌─────────────────────────────────────┐
│ Registrar Nova Advertência          │
├─────────────────────────────────────┤
│ Motorista: [Dropdown]               │
│ Placa: [Auto-preenchida]            │
│ Operação: [Auto-preenchida]         │
│ Data Infração: [DD/MM/YYYY]         │
│ Tipo: [Advertência/Suspensão]       │
│ Motivo: [Textarea]                  │
│                                     │
│ [Registrar] [Cancelar]              │
└─────────────────────────────────────┘
```

### Tela 2: Acompanhamento (Dashboard)
```
┌──────────────────────────────────────────────────┐
│ Acompanhamento de Advertências                   │
├──────────────────────────────────────────────────┤
│ Filtros: [Período] [Operação] [Status] [Gestor] │
├──────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Total   │ │Assinadas│ │Pendentes│ │Vencidas │ │
│ │   45    │ │   32    │ │   10    │ │    3    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├──────────────────────────────────────────────────┤
│ Motorista | Placa | Envio | Prazo | Status      │
│ ─────────────────────────────────────────────── │
│ João      | ABC-1 | 02/02 | 06/02 | ⏳ Pendente │
│ Maria     | XYZ-2 | 01/02 | 05/02 | ⚠️ Vencida  │
│ Pedro     | DEF-3 | 03/02 | 07/02 | ✓ Assinada │
└──────────────────────────────────────────────────┘
```

### Tela 3: Alertas (Vencidas)
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Advertências Vencidas                         │
├──────────────────────────────────────────────────┤
│ Total Vencidas: 3                               │
├──────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Maria Silva - Placa XYZ-2                   │ │
│ │ Vencida há: 2 dias                          │ │
│ │ Motivo: Excesso de velocidade               │ │
│ │ [Marcar como Assinada] [Reenviar]           │ │
│ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Tela 4: Relatórios
```
┌──────────────────────────────────────────────────┐
│ Relatórios de Advertências                       │
├──────────────────────────────────────────────────┤
│ Período: [01/01] até [31/01]                    │
│ Operação: [Todas]                               │
│ Gestor: [Todos]                                 │
│ [Gerar Relatório] [Exportar PDF] [Exportar XLS] │
├──────────────────────────────────────────────────┤
│ Resumo:                                         │
│ - Total: 45 advertências                        │
│ - Taxa de devolução: 71% (32/45)               │
│ - Tempo médio: 2.3 dias                         │
│ - Motorista com mais: João (5)                  │
│ - Operação com mais: BRF Primária (18)          │
└──────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Usuário

1. **Gestor acessa o sistema**
   ↓
2. **Clica em "Nova Advertência"** → Tela de Cadastro
   ↓
3. **Preenche dados e clica "Registrar"**
   ↓
4. **Acessa "Acompanhamento"** → Vê dashboard com KPIs
   ↓
5. **Filtra por período/operação** → Vê tabela atualizada
   ↓
6. **Acessa "Alertas"** → Vê advertências vencidas em vermelho
   ↓
7. **Marca como assinada ou reenvia** → Status atualiza
   ↓
8. **Acessa "Relatórios"** → Gera relatório por período/gestor
   ↓
9. **Exporta em PDF/Excel** → Compartilha com direção

---

## 📈 Benefícios

✅ **Prático:** Cadastro rápido, sem campos desnecessários
✅ **Leve:** Dashboards com dados essenciais
✅ **Eficiente:** Filtros e alertas automáticos
✅ **Rastreável:** Histórico completo e relatórios
✅ **Escalável:** Suporta múltiplos gestores e operações

---

## 🚀 Próximos Passos

1. Atualizar schema com campos de prazo e gestor
2. Implementar dashboard de acompanhamento
3. Implementar dashboard de alertas
4. Criar sistema de relatórios
5. Testar fluxo completo
6. Otimizar performance
