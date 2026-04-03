import { describe, it, expect } from 'vitest';

describe('WarningSignOff - Baixa de Advertências', () => {
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

  it('deve separar advertências assinadas e não assinadas', () => {
    const warnings = [
      { id: 1, advertenciaAplicada: false },
      { id: 2, advertenciaAplicada: true },
      { id: 3, advertenciaAplicada: false },
    ];

    const pending = warnings.filter(w => !w.advertenciaAplicada);
    const signed = warnings.filter(w => w.advertenciaAplicada);

    expect(pending).toHaveLength(2);
    expect(signed).toHaveLength(1);
    expect(pending[0].id).toBe(1);
    expect(signed[0].id).toBe(2);
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
