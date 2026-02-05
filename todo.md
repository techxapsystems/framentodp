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
- [ ] Otimizar performance da importação (reduzir de 5min para <30s)
- [x] Reorientar lógica: motorista OCIOSO = jornada >10h E direção <2h
- [x] Atualizar dashboards HOJE/SEMANA com novo contexto de ociosidade
