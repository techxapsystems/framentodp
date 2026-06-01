# Explicação da Aba "Hoje" e Sistema de Status

## 🎯 O que é a Aba "Hoje"?

A aba **"Hoje"** é um dashboard de **Status de Ociosidade** que mostra motoristas que estão dirigindo muito pouco em relação ao tempo de jornada. É um indicador de que o motorista pode estar tendo problemas de produtividade ou segurança.

**Definição:** Um motorista é considerado "OCIOSO" quando:
- **Jornada > 10 horas** (tempo total trabalhando)
- **Direção < 2 horas** (tempo efetivo dirigindo)

Exemplo: Motorista trabalhou 12 horas mas dirigiu apenas 1 hora = OCIOSO

---

## 📊 Componentes da Aba "Hoje"

### 1. **Filtros** (Topo)
```
Data DE: [02/06/2026]  Data ATÉ: [02/06/2026]  Gestor: [Todos os gestores]
```

- **Data DE/ATÉ:** Seleciona o período para análise
- **Gestor:** Filtra por quem criou as advertências (opcional)

### 2. **KPIs (Indicadores Principais)**
```
┌─────────────────┬──────────────┬─────────────────┬──────────────────┐
│ Total Motoristas│ Motoristas   │ HE Total do     │ Motoristas com   │
│                 │ Ociosos      │ Período         │ HE               │
├─────────────────┼──────────────┼─────────────────┼──────────────────┤
│      0          │      0       │    0h 0m        │       0          │
│                 │ NaN% do total│                 │                  │
└─────────────────┴──────────────┴─────────────────┴──────────────────┘
```

- **Total Motoristas:** Quantos motoristas foram importados
- **Motoristas Ociosos:** Quantos estão com jornada > 10h e direção < 2h
- **HE Total do Período:** Horas extras totais registradas
- **Motoristas com HE:** Quantos motoristas têm horas extras

### 3. **Tabela de Motoristas Ociosos**
```
┌──────────────┬────────┬──────────┬──────────┬────────────────────┐
│ Motorista    │ Placa  │ Jornada  │ Direção  │ Status             │
├──────────────┼────────┼──────────┼──────────┼────────────────────┤
│ João Silva   │ ABC123 │ 12h 30m  │ 1h 45m   │ 🔴 OCIOSO          │
│ Maria Santos │ XYZ789 │ 11h 15m  │ 0h 50m   │ 🔴 OCIOSO          │
│ Pedro Costa  │ DEF456 │ 10h 00m  │ 2h 30m   │ 🟢 NORMAL          │
└──────────────┴────────┴──────────┴──────────┴────────────────────┘
```

---

## 🔄 Como o Status Muda?

### Status Possíveis:

| Status | Cor | Significado | Ação Necessária |
|--------|-----|-------------|-----------------|
| 🟢 NORMAL | Verde | Motorista com direção adequada | Nenhuma |
| 🔴 OCIOSO | Vermelho | Motorista com pouca direção | Investigar/Orientar |
| ⚠️ ALERTA | Laranja | Motorista com horas extras | Monitorar |

### O que Faz o Status Mudar?

#### 1. **Importação de Dados**
```
Quando você importa um arquivo Excel com dados de jornadas:
  ↓
Sistema calcula: Jornada vs Direção
  ↓
Se Jornada > 10h E Direção < 2h → Status = OCIOSO
  ↓
Motorista aparece em VERMELHO na aba "Hoje"
```

#### 2. **Filtros Aplicados**
```
Você altera os filtros (Data DE/ATÉ, Gestor):
  ↓
Sistema recalcula os dados para o período selecionado
  ↓
Tabela atualiza automaticamente (sem reload)
  ↓
Motoristas aparecem/desaparecem conforme critérios
```

#### 3. **Resolução de Ociosidade**
```
Você clica em um motorista ocioso:
  ↓
Dialog abre com opções:
  - Marcar como "Resolvido"
  - Adicionar observações
  - Registrar ação tomada
  ↓
Status muda de OCIOSO → RESOLVIDO
  ↓
Motorista sai da lista vermelha
```

---

## 🔗 Conexão com Outras Abas

### Aba "Hoje" → Aba "Reincidentes"
```
Se um motorista é OCIOSO repetidamente:
  ↓
Você pode registrar uma ADVERTÊNCIA na aba "Reincidentes"
  ↓
Advertência fica com status PENDENTE (amarelo)
  ↓
Você marca como APLICADA (azul)
  ↓
Você marca como ASSINADA (verde)
```

### Aba "Hoje" → Aba "Acompanhamento"
```
Dashboard de Acompanhamento mostra:
  - Total de advertências enviadas
  - Quantas foram assinadas
  - Quantas estão pendentes
  - Quantas venceram (4+ dias)
```

---

## 📈 Fluxo Completo de um Motorista Ocioso

```
1. DETECÇÃO
   ├─ Arquivo importado
   ├─ Sistema detecta: Jornada 12h, Direção 1h
   └─ Status = OCIOSO (vermelho)

2. VISUALIZAÇÃO
   ├─ Aba "Hoje" mostra motorista em vermelho
   ├─ Gestor vê: "João Silva - OCIOSO"
   └─ Clica para ver detalhes

3. AÇÃO
   ├─ Opção 1: Marcar como "Resolvido" (investigou e foi OK)
   ├─ Opção 2: Ir para "Reincidentes" e registrar ADVERTÊNCIA
   └─ Opção 3: Registrar ORIENTAÇÃO (aviso informal)

4. ACOMPANHAMENTO
   ├─ Se escolheu ADVERTÊNCIA:
   │  ├─ Aba "Reincidentes" mostra advertência
   │  ├─ Marca como APLICADA
   │  ├─ Marca como ASSINADA
   │  └─ Aba "Acompanhamento" atualiza KPIs
   │
   └─ Se escolheu ORIENTAÇÃO:
      ├─ Contador: 1 de 3 orientações
      ├─ Na 3ª orientação: Gera ADVERTÊNCIA automática
      └─ Fluxo segue como acima

5. RELATÓRIO
   └─ Aba "Relatórios" mostra:
      ├─ Total de advertências por motorista
      ├─ Taxa de devolução
      ├─ Tempo médio de resolução
      └─ Motoristas com mais ocorrências
```

---

## 🎮 Exemplo Prático

### Cenário 1: Motorista Ocioso Resolvido
```
1. Aba "Hoje" mostra: João Silva - OCIOSO (vermelho)
2. Gestor clica em João Silva
3. Dialog abre com opções
4. Gestor escreve: "Investigado - Problema no GPS, resolvido"
5. Clica "Marcar como Resolvido"
6. João Silva sai da lista vermelha
7. Status muda para NORMAL (verde)
```

### Cenário 2: Motorista Ocioso com Advertência
```
1. Aba "Hoje" mostra: Maria Santos - OCIOSO (vermelho)
2. Gestor clica em Maria Santos
3. Dialog abre
4. Gestor clica "Registrar Advertência"
5. Vai para aba "Reincidentes"
6. Cria nova advertência: "Ociosidade repetida"
7. Tipo: "Advertência" | Nível: "Aviso 1"
8. Clica "Registrar"
9. Aba "Acompanhamento" atualiza:
   ├─ Total enviadas: +1
   ├─ Pendentes: +1
   └─ Taxa de devolução: recalcula
```

### Cenário 3: Motorista com 3 Orientações
```
1. Aba "Hoje" mostra: Pedro Costa - OCIOSO (vermelho)
2. Gestor clica "Registrar Orientação"
3. Dialog abre: "Orientações registradas: 1 de 3"
4. Próximo dia: Pedro Costa está ocioso novamente
5. Gestor registra 2ª orientação
6. Dialog mostra: "Orientações registradas: 2 de 3"
7. Próximo dia: Pedro Costa está ocioso novamente
8. Gestor registra 3ª orientação
9. Sistema gera AUTOMATICAMENTE:
   ├─ Nova ADVERTÊNCIA (Aviso 1)
   ├─ Aba "Reincidentes" mostra advertência
   ├─ Aba "Acompanhamento" atualiza
   └─ Gestor recebe notificação
```

---

## 🔧 Configurações

Na aba **"Configurações"**, você pode ajustar:

- **LIMITE_POUCO_RODADO_MIN:** Mínimo de direção (padrão: 120 min = 2h)
- **LIMITE_JORNADA_MIN:** Máximo de jornada (padrão: 600 min = 10h)

Se alterar para:
- Jornada > 8h E Direção < 1h = Novo critério de ociosidade
- Tabela atualiza automaticamente com novo cálculo

---

## 📝 Resumo

| Elemento | O que faz | Como muda |
|----------|-----------|----------|
| **Aba "Hoje"** | Mostra motoristas ociosos do dia | Atualiza ao importar dados ou alterar filtros |
| **Status OCIOSO** | Indica motorista com pouca direção | Muda quando: dados importados, filtros alterados, resolvido |
| **KPIs** | Mostra métricas do período | Recalcula ao mudar datas/filtros |
| **Tabela** | Lista motoristas com status | Atualiza em tempo real |
| **Ações** | Permite marcar como resolvido/advertir | Muda status e atualiza outras abas |

---

## ❓ Perguntas Frequentes

**P: Por que um motorista desaparece da lista?**
R: Porque:
- Você marcou como "Resolvido"
- Você alterou os filtros de data
- Você selecionou um gestor diferente
- Novos dados foram importados e ele não está mais ocioso

**P: Como saber se um motorista é reincidente?**
R: Vá para aba "Reincidentes" - mostra motoristas com advertências registradas

**P: O que significa "NaN% do total"?**
R: Significa que não há dados para calcular a porcentagem (ex: 0 motoristas = 0/0 = NaN)

**P: Posso desfazer uma ação?**
R: Sim, você pode editar a advertência na aba "Reincidentes" e alterar o status
