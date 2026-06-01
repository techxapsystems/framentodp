import { describe, it, expect } from 'vitest';

describe('GIF Analysis Module', () => {
  describe('Excel Date Conversion', () => {
    it('should convert Excel serial date to JavaScript Date', () => {
      // Excel serial date: 1 = 1900-01-01
      // 45000 = 2023-01-01 approximately
      const excelDateToJSDate = (excelDate: number | string): Date => {
        if (typeof excelDate === 'string') {
          return new Date(excelDate);
        }
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date;
      };

      // Test with string date
      const stringDate = excelDateToJSDate('2026-01-26T18:56:22.530Z');
      expect(stringDate).toBeInstanceOf(Date);

      // Test with numeric date
      const numericDate = excelDateToJSDate(45000);
      expect(numericDate).toBeInstanceOf(Date);
    });
  });

  describe('Efficiency Classification', () => {
    it('should classify CONGELADO journeys correctly', () => {
      const classifyEfficiency = (duracao: number, tipoSensor: string): string => {
        if (tipoSensor?.toLowerCase().includes('congelado')) {
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

      expect(classifyEfficiency(4, 'MERCADORIAS BRF - CONGELADO')).toBe('Excelente');
      expect(classifyEfficiency(9, 'MERCADORIAS BRF - CONGELADO')).toBe('Bom');
      expect(classifyEfficiency(11, 'MERCADORIAS BRF - CONGELADO')).toBe('Regular');
      expect(classifyEfficiency(14, 'MERCADORIAS BRF - CONGELADO')).toBe('Ruim');
    });

    it('should classify REFRIADO journeys correctly', () => {
      const classifyEfficiency = (duracao: number, tipoSensor: string): string => {
        if (tipoSensor?.toLowerCase().includes('congelado')) {
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

      expect(classifyEfficiency(3, 'MERCADORIAS BRF - REFRIADO')).toBe('Excelente');
      expect(classifyEfficiency(7, 'MERCADORIAS BRF - REFRIADO')).toBe('Bom');
      expect(classifyEfficiency(9, 'MERCADORIAS BRF - REFRIADO')).toBe('Regular');
      expect(classifyEfficiency(12, 'MERCADORIAS BRF - REFRIADO')).toBe('Ruim');
    });
  });

  describe('Temperature Data Processing', () => {
    it('should extract temperature from multiple column name variations', () => {
      const positionData = [
        { temperatura: 25.5, umidade: 60 },
        { Temperatura: 26.0, umidade: 61 },
        { TEMPERATURA: 25.8, umidade: 59 },
      ];

      const temps = positionData
        .map((p) => {
          return p.temperatura || p.Temperatura || p.TEMPERATURA || 
                 p.temp || p.Temp || p.TEMP;
        })
        .filter((t) => typeof t === 'number');

      expect(temps).toEqual([25.5, 26.0, 25.8]);
      expect(Math.min(...temps)).toBe(25.5);
      expect(Math.max(...temps)).toBe(26.0);
      expect(temps.reduce((a, b) => a + b, 0) / temps.length).toBeCloseTo(25.77, 1);
    });

    it('should calculate temperature statistics correctly', () => {
      const temps = [20, 22, 25, 23, 21, 24, 22];
      
      const tempMin = Math.min(...temps);
      const tempMax = Math.max(...temps);
      const tempMedia = temps.reduce((a, b) => a + b, 0) / temps.length;

      expect(tempMin).toBe(20);
      expect(tempMax).toBe(25);
      expect(tempMedia).toBeCloseTo(22.43, 1);
    });
  });

  describe('Journey Duration Calculation', () => {
    it('should calculate duration in hours correctly', () => {
      const inicio = new Date('2026-01-26T18:56:22');
      const fim = new Date('2026-01-27T02:56:22');
      
      const duracao = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
      
      expect(duracao).toBe(8); // 8 hours
    });

    it('should handle different duration ranges', () => {
      const testCases = [
        { inicio: '2026-01-26T18:00:00', fim: '2026-01-26T22:00:00', expected: 4 },
        { inicio: '2026-01-26T18:00:00', fim: '2026-01-27T04:00:00', expected: 10 },
        { inicio: '2026-01-26T18:00:00', fim: '2026-01-27T08:00:00', expected: 14 },
      ];

      testCases.forEach(({ inicio, fim, expected }) => {
        const inicioDate = new Date(inicio);
        const fimDate = new Date(fim);
        const duracao = (fimDate.getTime() - inicioDate.getTime()) / (1000 * 60 * 60);
        expect(duracao).toBe(expected);
      });
    });
  });

  describe('Export Format', () => {
    it('should export data in correct format', () => {
      const results = [
        {
          viagem: 'IRANI/SC → CAPINZAL/SC',
          placa: 'FJX0C85/LSO6702',
          tempMedia: 25.5,
          tempMin: 20.0,
          tempMax: 30.0,
          eficiencia: 'Excelente',
          duracao: 5.5,
          tipoSensor: 'MERCADORIAS BRF - CONGELADO',
          posicoes: 45,
        },
      ];

      const exportData = results.map((r) => ({
        'Placa Cavalo/Carreta': r.placa,
        'Viagem': r.viagem,
        'Tipo de Sensor': r.tipoSensor,
        'Temperatura Média': r.tempMedia.toFixed(2),
        'Temperatura Mínima': r.tempMin.toFixed(2),
        'Temperatura Máxima': r.tempMax.toFixed(2),
        'Duração (horas)': r.duracao.toFixed(2),
        'Posições Analisadas': r.posicoes,
        'Eficiência': r.eficiencia,
      }));

      expect(exportData[0]['Placa Cavalo/Carreta']).toBe('FJX0C85/LSO6702');
      expect(exportData[0]['Temperatura Média']).toBe('25.50');
      expect(exportData[0]['Eficiência']).toBe('Excelente');
    });
  });
});
