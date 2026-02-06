# Análise de Telas - Reincidentes vs Advertências

## 📊 Tela 1: Reincidentes (Recidivists.tsx)
**Propósito:** Gerenciar advertências de motoristas

### Funcionalidades:
- ✅ Filtrar por tipo de infração (Pouco Rodado / Horas Extras)
- ✅ Tabela com motoristas reincidentes
- ✅ Colunas: Nome, Placa, Tipo, Nível, Motivo, Status, Ações
- ✅ Criar nova advertência (dialog)
- ✅ Editar advertência existente
- ✅ Marcar como "Aplicada"
- ✅ Marcar como "Assinada"
- ✅ Registrar orientação
- ✅ Gerar PDF

### Problemas Identificados:
1. ❌ Formulário de criação não auto-preenche operação/placa
2. ❌ Data da infração não é formatada automaticamente
3. ❌ Falta tipo "Suspensão" (só tem Pouco Rodado / Horas Extras)
4. ❌ Sem filtro por status (Pendente/Aplicada/Assinada)

---

## 📈 Tela 2: Dashboard de Advertências (WarningsDashboard.tsx)
**Propósito:** Visualizar estatísticas e análises

### Funcionalidades:
- ✅ Gráficos por motorista (Aviso 1, 2, 3)
- ✅ Gráficos por operação
- ✅ Análise de distribuição

### Problemas Identificados:
1. ❌ Sem filtros de período
2. ❌ Sem ações diretas (não permite criar/editar)
3. ❌ Sem drill-down para ver detalhes
4. ❌ Sem informações de status (aplicada/assinada)

---

## 🎯 Tela 3: Acompanhamento (WarningsTracking.tsx)
**Propósito:** Acompanhar status de assinatura

### Funcionalidades:
- ✅ KPIs de advertências (Total, Assinadas, Pendentes)
- ✅ Filtros por período e operação
- ✅ Gráficos de tendência
- ✅ Distribuição por operação

---

## 📋 Recomendações de Consolidação

### Opção 1: Manter 3 Telas (Recomendado)
- **Reincidentes:** Gerenciar (CRUD)
- **Dashboard:** Visualizar estatísticas
- **Acompanhamento:** Acompanhar status de assinatura

### Opção 2: Consolidar em 2 Telas
- **Gerenciamento:** Reincidentes + Acompanhamento
- **Análise:** Dashboard

---

## ✅ Melhorias Imediatas Necessárias

### Reincidentes:
1. Auto-preencher operação baseado no motorista
2. Auto-preencher placa baseado no motorista
3. Formatar data automaticamente (XX/XX/XXXX)
4. Adicionar tipo "Suspensão"
5. Adicionar filtro por status

### Dashboard:
1. Adicionar filtros de período
2. Adicionar drill-down para ver motoristas
3. Mostrar status de assinatura

### Acompanhamento:
1. Adicionar filtro por status
2. Adicionar drill-down para ver advertências específicas
