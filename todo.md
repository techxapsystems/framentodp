# Dashboard Operacional de Motoristas - TODO

## Arquitetura & Banco de Dados
- [x] Definir schema completo (drivers, journeys, infractions, treatments, configs, email_logs)
- [x] Criar migrations Drizzle
- [x] Implementar allowlist de emails para OAuth

## Importação & Normalização
- [x] Implementar parser de Excel com detecção de aba "1_DADOS_BRUTOS"
- [x] Implementar detecção incremental por row_count
- [x] Normalizar datas, tempos (minutos), campos vazios
- [x] Validar estrutura de colunas
- [x] Criar histórico de importações

## Lógica de Análise
- [x] Calcular flags: POUCO_RODADO, TEM_HE, HE_ALERTA
- [x] Implementar cálculo de reincidências (7 e 30 dias)
- [x] Gerar ações sugeridas baseadas em regras operacionais
- [x] Implementar sistema de persistência de tratativas (status + observações)

## Tela HOJE
- [x] Criar layout com filtros (Data, Gestor, Operação)
- [x] Tabela de ofensores POUCO_RODADO com alertas visuais
- [x] Tabela de ofensores HORAS_EXTRAS
- [x] KPIs do dia (total motoristas, ofensores, HE total)
- [x] Botão "Resolver" e edição de status/observações

## Tela SEMANA
- [x] Gráfico de linha: % pouco rodado por dia
- [x] Gráfico de coluna: HE total por dia
- [x] Gráfico de linha: % pouco rodado últimas 8 semanas
- [x] Gráfico de coluna: HE total últimas 8 semanas
- [x] Top 10 reincidentes pouco rodado (semana)
- [x] Top 10 HE (semana)

## Tela de Importação
- [x] Upload de arquivo Excel
- [x] Preview de linhas novas
- [x] Histórico de importações
- [x] Validação de estrutura
- [x] Importação automática ao selecionar arquivo

## Tela de Configurações
- [x] Ajuste de LIMITE_POUCO_RODADO_MIN (padrão 120)
- [x] Ajuste de LIMITE_HE_ALERTA_MIN (padrão 90)
- [x] Ajuste de JANELA_REINCIDENCIA_DIAS (padrão 7)
- [x] Ajuste de JANELA_CRONICO_DIAS (padrão 30)
- [x] Botão de recalcular

## Notificações & Insights
- [ ] Integrar envio de email para gestores
- [ ] Implementar triggers para notificações (HE críticas, reincidências)
- [ ] Integrar LLM para geração de insights automáticos
- [ ] Armazenar log de notificações enviadas

## UI/UX & Design
- [x] Definir paleta de cores elegante e profissional
- [x] Criar DashboardLayout com sidebar navigation
- [x] Implementar tema visual consistente
- [x] Adicionar ícones e micro-interações
- [x] Garantir responsividade

## Testes & Deploy
- [ ] Testes unitários (importação, normalização, cálculos)
- [ ] Testes de integração (fluxo completo)
- [ ] Otimização de performance
- [ ] Documentação de deploy

## Bugs & Melhorias Urgentes
- [x] Renomear dashboard para "STATUS DE OCIOSIDADE BRF PRIMÁRIA"
- [x] Otimizar performance da importação (reduzir de 5min para <30s)
- [x] Reorientar lógica: motorista OCIOSO = jornada >10h E direção <2h
- [x] Atualizar dashboards HOJE/SEMANA com novo contexto de ociosidade

## Otimizações Implementadas
- [x] Batch inserts em chunks de 500 registros
- [x] Recalculate em background (setImmediate) - não bloqueia importação
- [x] Processamento paralelo de motoristas (chunks de 10)
- [x] Query otimizada para última importação (apenas rowCount)
- [x] Normalização em chunks de 100 linhas

## Bug Crítico
- [x] URGENTE: Importação travada - não completa mesmo após otimizações
  - Causa: Conversão para base64 no frontend estava travando
  - Solução: Usar btoa() nativo do navegador para conversão rápida

## Melhorias de Filtros
- [x] Filtro de data com intervalo (DE: até ATÉ:) na tela HOJE
- [x] Filtro por Gestor com dropdown na tela HOJE
- [x] Filtro por Operação na tela HOJE

## Tela de Reincidentes
- [x] Remover filtro de Operação da tela HOJE
- [x] Criar tabela de advertências no banco de dados
- [x] Criar APIs para gerenciar advertências
- [x] Criar tela REINCIDENTES com lista de motoristas reincidentes
- [x] Implementar sistema de advertências (Aviso 1, 2, 3)
- [x] Mostrar histórico de advertências por motorista

## Bugs Críticos
- [x] Filtros da tela HOJE não estão atualizando dados mesmo após importação
  - Causa: Query só usava data inicial, não o intervalo
  - Solução: Adicionar dateEnd ao backend e frontend
- [x] Adicionar 2 checks na tela Reincidentes: "Advertência Gerada" e "Advertência Aplicada"
  - Implementado com badges visuais (verde e azul)
  - Campos no banco de dados: advertenciaGerada, advertenciaAplicada, dataAplicacao

## Bug: Reincidentes Não Aparecem
- [x] Tela de Reincidentes não mostra nenhum motorista mesmo após importação
- [x] Verificar se dados foram importados corretamente
- [x] Verificar lógica de cálculo de reincidências
- [x] Verificar query getReincidents no backend
- [x] Reescrever getReincidentsWithWarnings para buscar reincidências (não apenas advertências registradas)

## Melhorias na Tela de Reincidentes
- [x] Adicionar painel de histórico de advertências no dialog de cadastro
- [x] Mostrar informações de reincidências (7 e 30 dias) no dialog
- [x] Indicar próximo nível de aviso recomendado

## Gerador de Email de Advertência
- [x] Adicionar campos de placa e dias de infração no dialog
- [x] Criar gerador de template de email com dados obrigatórios
- [x] Adicionar botão "Copiar Email" para área de transferência

## Persistência de Filtros
- [x] Criar contexto global para persistir filtros entre abas
- [x] Adicionar filtros na tela HOJE (Data DE/ATÉ, Gestor) - usando FilterContext
- [ ] Adicionar filtros na tela SEMANA (Data DE/ATÉ, Gestor)
- [ ] Adicionar filtros na tela REINCIDENTES (Data DE/ATÉ, Gestor)
- [ ] Adicionar filtros na tela IMPORTAÇÃO

## Bugs na Tela de Reincidentes
- [x] Lista de motoristas não aparece no dialog de nova advertência
  - Solução: Adicionada placa aos dados retornados de getReincidentsWithWarnings
- [x] Placa não é auto-preenchida ao selecionar motorista
  - Solução: Implementado handleConductorChange para auto-preencher placa

## Bug Crítico - Motoristas Não Listam
- [x] Motoristas não aparecem no dialog de nova advertência
  - Causa: getReincidentsWithWarnings buscava apenas motoristas com reincidências registradas
  - Solução: Reescrever função para buscar TODOS os motoristas com jornadas ociosas
- [x] Verificar se query getReincidents está retornando dados
- [x] Debugar data?.reincidents no frontend

## Branding Framento Transportes
- [x] Extrair logo do site da Framento
- [x] Atualizar paleta de cores no index.css (verde neon, azul escuro, branco)
- [x] Reestilizar sidebar com cores da Framento (azul escuro #001F3F)
- [x] Reestilizar botões e cards com novo tema (verde neon #00FF00)
- [x] Adicionar logo da Framento no header/sidebar
- [ ] Testar contraste e acessibilidade com novas cores

## Bugs & Melhorias Urgentes 2
- [x] Filtro de motorista não lista motoristas no dialog de nova advertência
  - RESOLVIDO: 44 motoristas agora listam corretamente
- [x] Criar dashboard de advertências por motorista (tabela + gráfico)
  - Implementado: Tela "Advertências" com gráficos por motorista e operação
- [x] Criar dashboard de advertências por operação (tabela + gráfico)
  - Implementado: Tela "Advertências" com estatísticas por operação
