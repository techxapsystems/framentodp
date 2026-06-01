import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Hook para invalidar todas as queries relacionadas ao dashboard de acompanhamento
 * Deve ser chamado após qualquer operação que modifique dados de advertências/suspensões
 */
export function useInvalidateDashboard() {
  const utils = trpc.useUtils();

  const invalidateDashboard = useCallback(async () => {
    // Invalidar queries de estatísticas gerais
    await utils.dashboard.getWarningsStats.invalidate();
    
    // Invalidar queries de operações
    await utils.dashboard.getWarningsStatsByOperation.invalidate();
    
    // Invalidar queries por motorista
    await utils.dashboard.getWarningsStatsByDriver.invalidate();
    
    // Invalidar queries de relatório
    await utils.dashboard.getWarningsReport.invalidate();
    
    // Invalidar lista de motoristas ociosos (para refletir mudanças)
    await utils.dashboard.getIdleDriversForWarning.invalidate();
  }, [utils]);

  return { invalidateDashboard };
}
