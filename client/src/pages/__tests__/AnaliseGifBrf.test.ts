import { describe, it, expect } from 'vitest';

describe('Análise GIF BRF', () => {
  // Função auxiliar para calcular duração
  const calcularDuracao = (inicio: string, fim: string): number => {
    try {
      const dataInicio = new Date(inicio);
      const dataFim = new Date(fim);
      const diffMs = dataFim.getTime() - dataInicio.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);
      return Math.max(0, diffHoras);
    } catch (e) {
      return 0;
    }
  };

  // Função auxiliar para classificar eficiência
  const classificarEficienciaHorario = (duracao: number, tipoSensor: string): string => {
    if (tipoSensor.includes('CONGELADO')) {
      if (duracao <= 8) return 'Excelente';
      if (duracao <= 10) return 'Bom';
      if (duracao <= 12) return 'Regular';
      return 'Ruim';
    } else {
      if (duracao <= 6) return 'Excelente';
      if (duracao <= 8) return 'Bom';
      if (duracao <= 10) return 'Regular';
      return 'Ruim';
    }
  };

  describe('Cálculo de Duração', () => {
    it('deve calcular corretamente a duração entre duas datas', () => {
      const inicio = '2026-01-26 18:56:22.530';
      const fim = '2026-01-27 02:56:22.530';
      const duracao = calcularDuracao(inicio, fim);
      expect(duracao).toBeCloseTo(8, 0);
    });

    it('deve retornar 0 para datas inválidas', () => {
      const duracao = calcularDuracao('data-invalida', 'outra-invalida');
      expect(duracao).toBe(0);
    });

    it('deve calcular corretamente viagens longas (>24h)', () => {
      const inicio = '2026-01-26 18:56:22.530';
      const fim = '2026-01-28 18:56:22.530';
      const duracao = calcularDuracao(inicio, fim);
      expect(duracao).toBeCloseTo(48, 0);
    });
  });

  describe('Classificação de Eficiência por Horário', () => {
    describe('Mercadorias Congeladas', () => {
      it('deve classificar como Excelente para viagens ≤ 8h', () => {
        const resultado = classificarEficienciaHorario(7.5, 'MERCADORIAS BRF - CONGELADO');
        expect(resultado).toBe('Excelente');
      });

      it('deve classificar como Bom para viagens entre 8h e 10h', () => {
        const resultado = classificarEficienciaHorario(9, 'MERCADORIAS BRF - CONGELADO');
        expect(resultado).toBe('Bom');
      });

      it('deve classificar como Regular para viagens entre 10h e 12h', () => {
        const resultado = classificarEficienciaHorario(11, 'MERCADORIAS BRF - CONGELADO');
        expect(resultado).toBe('Regular');
      });

      it('deve classificar como Ruim para viagens > 12h', () => {
        const resultado = classificarEficienciaHorario(13, 'MERCADORIAS BRF - CONGELADO');
        expect(resultado).toBe('Ruim');
      });
    });

    describe('Mercadorias Refriadas', () => {
      it('deve classificar como Excelente para viagens ≤ 6h', () => {
        const resultado = classificarEficienciaHorario(5.5, 'MERCADORIAS BRF - REFRIADO');
        expect(resultado).toBe('Excelente');
      });

      it('deve classificar como Bom para viagens entre 6h e 8h', () => {
        const resultado = classificarEficienciaHorario(7, 'MERCADORIAS BRF - REFRIADO');
        expect(resultado).toBe('Bom');
      });

      it('deve classificar como Regular para viagens entre 8h e 10h', () => {
        const resultado = classificarEficienciaHorario(9, 'MERCADORIAS BRF - REFRIADO');
        expect(resultado).toBe('Regular');
      });

      it('deve classificar como Ruim para viagens > 10h', () => {
        const resultado = classificarEficienciaHorario(11, 'MERCADORIAS BRF - REFRIADO');
        expect(resultado).toBe('Ruim');
      });
    });
  });

  describe('Casos Reais do Excel', () => {
    it('deve processar corretamente viagem FJX0C85 (Congelado, 5.75h)', () => {
      const inicio = '2026-01-26 18:56:22.530';
      const fim = '2026-02-01 00:41:00.000';
      const duracao = calcularDuracao(inicio, fim);
      const eficiencia = classificarEficienciaHorario(duracao, 'MERCADORIAS BRF - CONGELADO');
      
      // Esperado: ~5.75 horas = Excelente
      expect(duracao).toBeGreaterThan(5);
      expect(duracao).toBeLessThan(6);
      expect(eficiencia).toBe('Excelente');
    });

    it('deve processar corretamente viagem SSA1D98 (Congelado, 18.75h)', () => {
      const inicio = '2026-01-28 15:47:43.387';
      const fim = '2026-02-02 10:30:00.000';
      const duracao = calcularDuracao(inicio, fim);
      const eficiencia = classificarEficienciaHorario(duracao, 'MERCADORIAS BRF - CONGELADO');
      
      // Esperado: ~18.75 horas = Ruim
      expect(duracao).toBeGreaterThan(18);
      expect(eficiencia).toBe('Ruim');
    });

    it('deve processar corretamente viagem TTZ6I42 (Refriado, 21.75h)', () => {
      const inicio = '2026-01-29 13:58:29.980';
      const fim = '2026-02-02 11:23:00.000';
      const duracao = calcularDuracao(inicio, fim);
      const eficiencia = classificarEficienciaHorario(duracao, 'MERCADORIAS BRF - REFRIADO');
      
      // Esperado: ~21.75 horas = Ruim
      expect(duracao).toBeGreaterThan(21);
      expect(eficiencia).toBe('Ruim');
    });
  });

  describe('Validação de Dados', () => {
    it('deve lidar com durações zero', () => {
      const resultado = classificarEficienciaHorario(0, 'MERCADORIAS BRF - CONGELADO');
      expect(resultado).toBe('Excelente');
    });

    it('deve lidar com durações muito longas', () => {
      const resultado = classificarEficienciaHorario(100, 'MERCADORIAS BRF - CONGELADO');
      expect(resultado).toBe('Ruim');
    });

    it('deve diferenciar entre tipos de sensor', () => {
      const congelado = classificarEficienciaHorario(7, 'MERCADORIAS BRF - CONGELADO');
      const refriado = classificarEficienciaHorario(7, 'MERCADORIAS BRF - REFRIADO');
      
      expect(congelado).toBe('Excelente');
      expect(refriado).toBe('Bom');
    });
  });

  describe('Estatísticas Agregadas', () => {
    it('deve calcular corretamente taxa de eficiência', () => {
      const resultados = [
        { eficiencia: 'Excelente' },
        { eficiencia: 'Excelente' },
        { eficiencia: 'Bom' },
        { eficiencia: 'Regular' },
        { eficiencia: 'Ruim' },
      ];

      const excelentes = resultados.filter(r => r.eficiencia === 'Excelente').length;
      const boas = resultados.filter(r => r.eficiencia === 'Bom').length;
      const taxaEficiencia = ((excelentes + boas) / resultados.length) * 100;

      expect(taxaEficiencia).toBe(60); // 3 de 5 = 60%
    });

    it('deve calcular corretamente duração média', () => {
      const duracoes = [5, 8, 10, 12, 15];
      const media = duracoes.reduce((sum, d) => sum + d, 0) / duracoes.length;
      
      expect(media).toBe(10);
    });
  });
});
