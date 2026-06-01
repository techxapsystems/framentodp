# Auditoria do Sistema - Bugs Encontrados

## BUG CRÍTICO 1: Login REST não seta cookie JWT de sessão
- O login REST (`/api/auth/login`) retorna sucesso e salva no localStorage
- Mas NÃO seta o cookie `app_session_id` com JWT
- Resultado: TODAS as chamadas tRPC protectedProcedure falham com UNAUTHORIZED
- Afeta: Listar motoristas, criar advertências, acompanhamento, relatórios, etc.
- Solução: No auth-rest.ts, após login bem-sucedido, criar JWT e setar cookie

## BUG 2: openId do admin é null
- O admin gabriel.ferreira tem openId = null no banco
- O SDK.authenticateRequest busca por openId
- Solução: Gerar um openId único para o admin e usar no JWT

## BUG 3: createWarning input schema não aceita tipo/categoria corretos
- O schema aceita tipo: "pouco_rodado" | "horas_extras" 
- Mas o frontend envia tipo: "advertencia" | "suspensao"
- Solução: Atualizar o schema do createWarning

## BUG 4: 106 TypeScript errors
- Principal: 'userId' does not exist in type para journeys insert
- Precisa verificar e corrigir
