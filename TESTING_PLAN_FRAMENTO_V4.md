# Plano de Testes Completo - Framento v4

## Objetivo
Validar 100% da funcionalidade de importação em massa de advertências antes de publicar em produção.

---

## Fase 1: Cenários de Teste com Dados Reais

### Cenário 1: Importação Normal (71 motoristas)
- **Arquivo**: CópiadeJornada-Blacklist20260526.xls
- **Esperado**: 
  - Lê aba "Advertenvias 23" (última aba com "advert")
  - Processa 71 registros
  - Detecta infrações automáticamente
  - Gera PDFs apenas para ADVERTENCIA
  - Salva no banco de dados

### Cenário 2: Múltiplas Infrações por Motorista
- **Esperado**: 
  - Agrupa infrações por CPF
  - Gera um PDF por motorista (não por infração)
  - Texto contém TODAS as infrações

### Cenário 3: Detecção de Status por Cor
- **#FFFF00 (Amarelo)**: ADVERTENCIA
- **#FFCC00 (Laranja)**: EM_REVISAO
- **Sem cor**: CONFERENCIA_MANUAL

### Cenário 4: Validação de Campos Obrigatórios
- **Campos obrigatórios**: Condutor, CPF, Placa, Operação, Data Início
- **Esperado**: Rejeita registros incompletos

### Cenário 5: Normalização de Dados
- **CPF**: Remove caracteres especiais, valida formato
- **Placa**: Converte para maiúsculas, valida formato
- **Tempos**: Converte HH:MM para minutos, arredonda corretamente

---

## Fase 2: Testes de Detecção de Infrações

### Teste 2.1: Jornada Excessiva
- **Regra**: Seg-Sex máx 08:00, Sábado máx 04:00
- **Teste**: Motorista com 09:00 seg-sex
- **Esperado**: Detecta "Jornada excessiva" + texto específico

### Teste 2.2: Refeição Insuficiente
- **Regra**: Mínimo 01:00 intrajornada
- **Teste**: Motorista com 00:30 refeição
- **Esperado**: Detecta "Refeição insuficiente" + texto específico

### Teste 2.3: Interstício Insuficiente
- **Regra**: Mínimo 11:00 interjornada
- **Teste**: Motorista com 10:00 interstício
- **Esperado**: Detecta "Interstício insuficiente" + texto específico

### Teste 2.4: Múltiplas Infrações
- **Teste**: Motorista com jornada + refeição + interstício insuficientes
- **Esperado**: Agrupa todas as 3 infrações em um PDF

---

## Fase 3: Testes de Parser

### Teste 3.1: Detecção de Aba Correta
- **Esperado**: Encontra "Advertenvias 23" (última aba com "advert")
- **Validação**: Confirma nome da aba no resultado

### Teste 3.2: Mapeamento de Colunas
- **Esperado**: Encontra colunas mesmo com nomes ligeiramente diferentes
- **Sinônimos testados**: "Condutor" / "Motorista", "Placa" / "Veículo", etc.

### Teste 3.3: Extração de Cores
- **Esperado**: Identifica cor de cada célula (#FFFF00, #FFCC00, etc.)
- **Validação**: Status correto para cada registro

---

## Fase 4: Testes de PDF Generator

### Teste 4.1: Conteúdo do PDF
- **Esperado**: 
  - Cabeçalho com protocolo
  - Dados do motorista (CPF, placa, operação)
  - Dados da infração (data, dia da semana)
  - Texto da advertência
  - Assinaturas
  - Rodapé com data/hora

### Teste 4.2: Formatação de Dados
- **CPF**: 123.456.789-10 (formatado)
- **Data**: "Quinta-feira, 26 de maio de 2026"
- **Tempos**: "08:30" (HH:MM)

### Teste 4.3: Quebra de Linha
- **Esperado**: Texto longo quebra corretamente
- **Validação**: Nenhuma palavra cortada

---

## Fase 5: Testes de Backend Mutation

### Teste 5.1: Fluxo Completo
1. Upload do arquivo
2. Parse e validação
3. Geração de PDFs
4. Salvamento no banco
5. Retorno com estatísticas

### Teste 5.2: Estatísticas Corretas
- **Esperado**: 
  - totalProcessado = 71
  - advertenciasCriadas = X (apenas ADVERTENCIA)
  - emRevisao = Y (EM_REVISAO)
  - conferencia = Z (CONFERENCIA_MANUAL)
  - X + Y + Z = 71

### Teste 5.3: Banco de Dados
- **Esperado**: 
  - Registros salvos com campos corretos
  - aplicadoPor = email do usuário admin
  - criadoEm = data/hora da importação
  - advertenciaAplicada = false (padrão)

---

## Fase 6: Testes de Edge Cases

### Teste 6.1: CPF Inválido
- **Esperado**: Rejeita com erro específico

### Teste 6.2: Placa Inválida
- **Esperado**: Rejeita com erro específico

### Teste 6.3: Data Inválida
- **Esperado**: Rejeita com erro específico

### Teste 6.4: Arquivo Vazio
- **Esperado**: Retorna erro "Nenhum registro encontrado"

### Teste 6.5: Aba Não Encontrada
- **Esperado**: Retorna erro "Aba com advertências não encontrada"

---

## Fase 7: Testes de Integridade

### Teste 7.1: Duplicatas
- **Esperado**: Não cria duplicatas se importar 2x o mesmo arquivo

### Teste 7.2: Auditoria
- **Esperado**: Cada importação registra:
  - Quem fez (aplicadoPor)
  - Quando (criadoEm)
  - Quantas (totalProcessado)

### Teste 7.3: Filtro de Pendentes
- **Esperado**: Mostra todas as advertências não assinadas
- **Independente de data**: Sobresai filtro de data

---

## Fase 8: Testes de UI

### Teste 8.1: Upload de Arquivo
- Drag-and-drop funciona
- Seletor de arquivo funciona
- Validação de tipo de arquivo

### Teste 8.2: Preview de Dados
- Mostra registros válidos
- Mostra registros com erro
- Mostra estatísticas

### Teste 8.3: Importação
- Botão "Importar" funciona
- Feedback em tempo real
- Sucesso/erro exibidos corretamente

---

## Critérios de Aceição

✅ Todos os testes da Fase 1-3 passam
✅ Todos os PDFs gerados corretamente
✅ Banco de dados intacto após importação
✅ Filtro de pendentes funciona
✅ UI responsiva e sem erros
✅ Nenhum erro no console do navegador
✅ Nenhum erro no servidor

---

## Resultado Final

**Data de Teste**: [PREENCHIDO DURANTE TESTES]
**Tester**: [PREENCHIDO DURANTE TESTES]
**Status**: ⏳ PENDENTE

### Resumo de Testes
- Fase 1: ⏳ Pendente
- Fase 2: ⏳ Pendente
- Fase 3: ⏳ Pendente
- Fase 4: ⏳ Pendente
- Fase 5: ⏳ Pendente
- Fase 6: ⏳ Pendente
- Fase 7: ⏳ Pendente
- Fase 8: ⏳ Pendente

**Aprovado para Produção**: ⏳ NÃO
