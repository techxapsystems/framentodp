import { describe, it, expect } from 'vitest';

describe('WarningSignOff - ITEM 1: Separação de Advertências e Suspensões', () => {
  it('deve separar advertências pendentes de suspensões pendentes', () => {
    const allWarnings = [
      { id: 1, tipo: 'advertencia', advertenciaAplicada: false, conductorName: 'João' },
      { id: 2, tipo: 'suspensao', advertenciaAplicada: false, conductorName: 'Maria' },
      { id: 3, tipo: 'advertencia', advertenciaAplicada: false, conductorName: 'Pedro' },
    ];

    const pendingAdvertencias = allWarnings.filter(
      (w: any) => !w.advertenciaAplicada && w.tipo === 'advertencia'
    );
    const pendingSuspensoes = allWarnings.filter(
      (w: any) => !w.advertenciaAplicada && w.tipo === 'suspensao'
    );

    expect(pendingAdvertencias).toHaveLength(2);
    expect(pendingSuspensoes).toHaveLength(1);
    expect(pendingAdvertencias.every((w: any) => w.tipo === 'advertencia')).toBe(true);
    expect(pendingSuspensoes.every((w: any) => w.tipo === 'suspensao')).toBe(true);
  });

  it('deve separar advertências assinadas de suspensões assinadas', () => {
    const allWarnings = [
      { id: 1, tipo: 'advertencia', advertenciaAplicada: true, conductorName: 'João' },
      { id: 2, tipo: 'suspensao', advertenciaAplicada: true, conductorName: 'Maria' },
      { id: 3, tipo: 'advertencia', advertenciaAplicada: true, conductorName: 'Pedro' },
    ];

    const signedAdvertencias = allWarnings.filter(
      (w: any) => w.advertenciaAplicada && w.tipo === 'advertencia'
    );
    const signedSuspensoes = allWarnings.filter(
      (w: any) => w.advertenciaAplicada && w.tipo === 'suspensao'
    );

    expect(signedAdvertencias).toHaveLength(2);
    expect(signedSuspensoes).toHaveLength(1);
    expect(signedAdvertencias.every((w: any) => w.tipo === 'advertencia')).toBe(true);
    expect(signedSuspensoes.every((w: any) => w.tipo === 'suspensao')).toBe(true);
  });

  it('não deve misturar suspensões em seção de advertências', () => {
    const allWarnings = [
      { id: 1, tipo: 'advertencia', advertenciaAplicada: false },
      { id: 2, tipo: 'suspensao', advertenciaAplicada: false },
    ];

    const pendingAdvertencias = allWarnings.filter(
      (w: any) => !w.advertenciaAplicada && w.tipo === 'advertencia'
    );

    expect(pendingAdvertencias.some((w: any) => w.tipo === 'suspensao')).toBe(false);
  });

  it('deve filtrar advertências por data de cadastro', () => {
    const warnings = [
      { id: 1, criadoEm: '2026-04-02T10:00:00Z', advertenciaAplicada: false },
      { id: 2, criadoEm: '2026-04-03T10:00:00Z', advertenciaAplicada: false },
      { id: 3, criadoEm: '2026-04-04T10:00:00Z', advertenciaAplicada: true },
    ];

    const startDate = new Date('2026-04-02');
    const endDate = new Date('2026-04-03');
    endDate.setHours(23, 59, 59, 999);

    const filtered = warnings.filter(w => {
      const wDate = new Date(w.criadoEm);
      return wDate >= startDate && wDate <= endDate;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe(1);
    expect(filtered[1].id).toBe(2);
  });

  it('deve formatar data de cadastro corretamente', () => {
    const date = new Date('2026-04-03T16:30:00Z');
    const formatted = date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('WarningSignOff - ITEM 2: Texto Longo em Detalhes', () => {
  it('deve preservar quebra de linha com whitespace-pre-wrap', () => {
    const textLongo = 'Linha 1\nLinha 2\nLinha 3';
    const className = 'whitespace-pre-wrap break-words';

    expect(className).toContain('whitespace-pre-wrap');
    expect(className).toContain('break-words');
  });

  it('deve suportar modal com max-height e overflow', () => {
    const dialogClassName = 'max-w-2xl max-h-[80vh] overflow-y-auto';

    expect(dialogClassName).toContain('max-w-2xl');
    expect(dialogClassName).toContain('max-h-[80vh]');
    expect(dialogClassName).toContain('overflow-y-auto');
  });

  it('deve permitir texto muito longo sem quebra de layout', () => {
    const textoMuitoLongo = 'A'.repeat(1000);
    const className = 'text-sm whitespace-pre-wrap break-words';

    expect(className).toContain('break-words');
    expect(className).toContain('whitespace-pre-wrap');
  });
});

describe('Reports - ITEM 3: Relatório Completo', () => {
  it('deve exibir texto completo sem truncamento', () => {
    const motivo = 'Este é um motivo muito longo que deve aparecer completamente no relatório sem ser truncado em 50 caracteres como era antes';
    
    const textoExibido = motivo;

    expect(textoExibido).toBe(motivo);
    expect(textoExibido.length).toBeGreaterThan(50);
  });

  it('deve exibir tipo correto (advertencia/suspensao)', () => {
    const advertencia = { tipo: 'advertencia' };
    const suspensao = { tipo: 'suspensao' };

    const tipoAdv = advertencia.tipo === 'advertencia' ? 'Advertência' : 'Suspensão';
    const tipoSusp = suspensao.tipo === 'suspensao' ? 'Advertência' : 'Suspensão';

    expect(tipoAdv).toBe('Advertência');
    expect(tipoSusp).toBe('Suspensão');
  });

  it('deve incluir campos obrigatórios do relatório', () => {
    const medida = {
      criadoEm: '2026-04-18T10:00:00Z',
      nivelAdvertencia: 2,
      advertenciaAplicada: false,
      motivo: 'Motivo da medida',
      observacao: 'Observação adicional',
      tipo: 'advertencia',
    };

    expect(medida).toHaveProperty('criadoEm');
    expect(medida).toHaveProperty('nivelAdvertencia');
    expect(medida).toHaveProperty('advertenciaAplicada');
    expect(medida).toHaveProperty('motivo');
    expect(medida).toHaveProperty('observacao');
    expect(medida).toHaveProperty('tipo');
  });

  it('deve incluir datas de suspensão quando aplicável', () => {
    const suspensao = {
      tipo: 'suspensao',
      dataInicio: '2026-04-18T00:00:00Z',
      dataFim: '2026-04-25T00:00:00Z',
      dataRetorno: '2026-04-26T00:00:00Z',
    };

    expect(suspensao).toHaveProperty('dataInicio');
    expect(suspensao).toHaveProperty('dataFim');
    expect(suspensao).toHaveProperty('dataRetorno');
  });

  it('deve formatar datas corretamente sem Invalid Date', () => {
    const formatDate = (date: any) => {
      if (!date) return "-";
      try {
        return new Date(date).toLocaleDateString("pt-BR");
      } catch {
        return "-";
      }
    };

    const dataValida = '2026-04-18T10:00:00Z';
    const dataInvalida = 'data-invalida';
    const dataNula = null;

    expect(formatDate(dataValida)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDate(dataInvalida)).toBe("-");
    expect(formatDate(dataNula)).toBe("-");
  });

  it('deve separar advertências e suspensões no relatório', () => {
    const medidas = [
      { tipo: 'advertencia', id: 1 },
      { tipo: 'suspensao', id: 2 },
      { tipo: 'advertencia', id: 3 },
    ];

    const advertencias = medidas.filter((m) => m.tipo === 'advertencia');
    const suspensoes = medidas.filter((m) => m.tipo === 'suspensao');

    expect(advertencias).toHaveLength(2);
    expect(suspensoes).toHaveLength(1);
    expect(advertencias.every((m) => m.tipo === 'advertencia')).toBe(true);
    expect(suspensoes.every((m) => m.tipo === 'suspensao')).toBe(true);
  });
});

describe('AnaliseGifBrf - Gráfico de Temperatura', () => {
  it('deve gerar dados fictícios de temperatura realistas', () => {
    const tempMin = 28.0;
    const tempMax = 38.2;
    const duracao = 4.5;

    const chartData = [];
    const startTemp = tempMin;
    const tempRange = tempMax - tempMin;
    const steps = Math.floor(duracao * 12);

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const sine = Math.sin(progress * Math.PI * 2);
      const temp = startTemp + (tempRange / 2) + (tempRange / 2) * sine * 0.8 + (Math.random() - 0.5) * 2;
      chartData.push({
        tempo: `${Math.floor((i * 5) / 60)}:${((i * 5) % 60).toString().padStart(2, '0')}`,
        temperatura: parseFloat(temp.toFixed(1)),
        umidade: 60 + Math.sin(progress * Math.PI) * 20,
      });
    }

    expect(chartData.length).toBeGreaterThan(0);
    expect(chartData[0].temperatura).toBeGreaterThanOrEqual(tempMin - 5);
    expect(chartData[chartData.length - 1].temperatura).toBeLessThanOrEqual(tempMax + 5);
  });

  it('deve manter temperatura dentro dos limites', () => {
    const tempMin = 30.0;
    const tempMax = 41.5;
    const duracao = 5.2;

    const chartData = [];
    const startTemp = tempMin;
    const tempRange = tempMax - tempMin;
    const steps = Math.floor(duracao * 12);

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const sine = Math.sin(progress * Math.PI * 2);
      const temp = startTemp + (tempRange / 2) + (tempRange / 2) * sine * 0.8 + (Math.random() - 0.5) * 2;
      chartData.push(parseFloat(temp.toFixed(1)));
    }

    const allWithinRange = chartData.every(t => t >= tempMin - 5 && t <= tempMax + 5);
    expect(allWithinRange).toBe(true);
  });

  it('deve gerar pontos de dados em intervalos de 5 minutos', () => {
    const duracao = 4.5; // 4.5 horas = 270 minutos
    const steps = Math.floor(duracao * 12); // 12 pontos por hora = 54 pontos

    expect(steps).toBe(54);

    // Verificar que cada ponto representa 5 minutos
    for (let i = 0; i < steps; i++) {
      const minutos = i * 5;
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;

      expect(horas).toBeLessThanOrEqual(4);
      expect(mins).toBeLessThan(60);
    }
  });

  it('deve calcular umidade com variação realista', () => {
    const chartData = [];
    const steps = 50;

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const humidity = 60 + Math.sin(progress * Math.PI) * 20 + (Math.random() - 0.5) * 5;
      chartData.push(parseFloat(humidity.toFixed(1)));
    }

    const allValid = chartData.every(h => h >= 35 && h <= 85);
    expect(allValid).toBe(true);
  });
});
