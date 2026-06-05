import { describe, it, expect } from 'vitest';
import {
  normalizeCPF,
  normalizePlaca,
  timeToMinutes,
  minutesToFormat,
  parseDataAndDia,
  getLimiteJornada,
  detectarInfracoes,
  detectarStatus,
  gerarTextoAdvertencia,
  validarLinha,
  encontrarColuna,
  validarColunasObrigatorias,
  ParsedRow,
} from './framentoRulesEngineV4';

describe('Framento Rules Engine v4', () => {
  // ===== TESTES DE NORMALIZAÇÃO =====

  describe('normalizeCPF', () => {
    it('deve remover pontos e traços', () => {
      const result = normalizeCPF('123.456.789-00');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('12345678900');
    });

    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      const result = normalizeCPF('123.456.789');
      expect(result.valid).toBe(false);
    });

    it('deve aceitar CPF sem formatação', () => {
      const result = normalizeCPF('12345678900');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('12345678900');
    });

    it('deve rejeitar CPF vazio', () => {
      const result = normalizeCPF('');
      expect(result.valid).toBe(false);
    });
  });

  describe('normalizePlaca', () => {
    it('deve converter para maiúsculas', () => {
      expect(normalizePlaca('abc1234')).toBe('ABC1234');
    });

    it('deve remover espaços', () => {
      expect(normalizePlaca('ABC 1234')).toBe('ABC1234');
    });

    it('deve retornar vazio para entrada vazia', () => {
      expect(normalizePlaca('')).toBe('');
    });
  });

  // ===== TESTES DE CONVERSÃO DE TEMPO =====

  describe('timeToMinutes', () => {
    it('deve converter HH:MM para minutos', () => {
      expect(timeToMinutes('08:30')).toBe(510); // 8*60 + 30
    });

    it('deve converter HH:MM:SS para minutos', () => {
      expect(timeToMinutes('08:30:45')).toBe(511); // 45 segundos arredondam para 1 minuto
    });

    it('deve converter decimal (fração de dia)', () => {
      expect(timeToMinutes(0.354166)).toBe(510); // ~08:30
    });

    it('deve retornar null para ausente', () => {
      expect(timeToMinutes('')).toBeNull();
      expect(timeToMinutes('-')).toBeNull();
      expect(timeToMinutes('—')).toBeNull();
    });

    it('deve retornar 0 para 00:00', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });
  });

  describe('minutesToFormat', () => {
    it('deve converter minutos para HHhMM', () => {
      expect(minutesToFormat(510)).toBe('8h30');
      expect(minutesToFormat(600)).toBe('10h00');
      expect(minutesToFormat(37)).toBe('0h37');
    });

    it('deve retornar vazio para null', () => {
      expect(minutesToFormat(null)).toBe('');
    });
  });

  // ===== TESTES DE DATA E DIA DA SEMANA =====

  describe('parseDataAndDia', () => {
    it('deve extrair data de string DD/MM/YYYY', () => {
      const result = parseDataAndDia(undefined, '02/06/2026 14:30:00');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.data.getDate()).toBe(2);
        expect(result.data.getMonth()).toBe(5); // 0-indexed
        expect(result.data.getFullYear()).toBe(2026);
      }
    });

    it('deve calcular dia da semana corretamente', () => {
      // 02/06/2026 é uma terça-feira
      const result = parseDataAndDia(undefined, '02/06/2026');
      expect(result?.dia).toBe('terça');
    });

    it('deve retornar null para data inválida', () => {
      const result = parseDataAndDia(undefined, 'data_invalida');
      expect(result).toBeNull();
    });
  });

  describe('getLimiteJornada', () => {
    it('deve retornar 480 (08:00) para segunda a sexta', () => {
      expect(getLimiteJornada('segunda')).toBe(480);
      expect(getLimiteJornada('terça')).toBe(480);
      expect(getLimiteJornada('quarta')).toBe(480);
      expect(getLimiteJornada('quinta')).toBe(480);
      expect(getLimiteJornada('sexta')).toBe(480);
    });

    it('deve retornar 240 (04:00) para sábado', () => {
      expect(getLimiteJornada('sábado')).toBe(240);
    });

    it('deve retornar 0 para domingo', () => {
      expect(getLimiteJornada('domingo')).toBe(0);
    });
  });

  // ===== TESTES DE DETECÇÃO DE INFRAÇÕES =====

  describe('detectarInfracoes', () => {
    it('deve detectar excesso de jornada', () => {
      const row: ParsedRow = {
        condutor: 'Test',
        cpf: '12345678900',
        placa: 'ABC1234',
        jornada_sem_refeicao: 540, // 09:00 (excede 08:00)
        inicio: new Date('2026-06-02'),
        data: new Date('2026-06-02'), // terça
      };

      const infracoes = detectarInfracoes(row);
      expect(infracoes.length).toBeGreaterThan(0);
      expect(infracoes.some(i => i.tipo === 'jornada')).toBe(true);
    });

    it('deve detectar refeição ausente', () => {
      const row: ParsedRow = {
        condutor: 'Test',
        cpf: '12345678900',
        placa: 'ABC1234',
        jornada_sem_refeicao: 480,
        inicio: new Date('2026-06-02'),
        refeicao: 0, // Ausente
      };

      const infracoes = detectarInfracoes(row);
      expect(infracoes.some(i => i.tipo === 'refeicao' && i.descricao === 'Sem intrajornada')).toBe(true);
    });

    it('deve detectar refeição insuficiente', () => {
      const row: ParsedRow = {
        condutor: 'Test',
        cpf: '12345678900',
        placa: 'ABC1234',
        jornada_sem_refeicao: 480,
        inicio: new Date('2026-06-02'),
        refeicao: 30, // Menos de 60 minutos
      };

      const infracoes = detectarInfracoes(row);
      expect(infracoes.some(i => i.tipo === 'refeicao' && i.descricao === 'Intrajornada insuficiente')).toBe(true);
    });

    it('deve detectar interstício insuficiente', () => {
      const row: ParsedRow = {
        condutor: 'Test',
        cpf: '12345678900',
        placa: 'ABC1234',
        jornada_sem_refeicao: 480,
        inicio: new Date('2026-06-02'),
        intersticio: 600, // Menos de 660 (11:00)
      };

      const infracoes = detectarInfracoes(row);
      expect(infracoes.some(i => i.tipo === 'intersticio')).toBe(true);
    });
  });

  // ===== TESTES DE STATUS POR COR =====

  describe('detectarStatus', () => {
    it('deve retornar ADVERTENCIA para #FFFF00', () => {
      expect(detectarStatus('#FFFF00')).toBe('ADVERTENCIA');
    });

    it('deve retornar EM_REVISAO para #FFCC00', () => {
      expect(detectarStatus('#FFCC00')).toBe('EM_REVISAO');
    });

    it('deve retornar CONFERENCIA_MANUAL para cor desconhecida', () => {
      expect(detectarStatus('#FF0000')).toBe('CONFERENCIA_MANUAL');
      expect(detectarStatus(undefined)).toBe('CONFERENCIA_MANUAL');
    });
  });

  // ===== TESTES DE MAPEAMENTO DE COLUNAS =====

  describe('encontrarColuna', () => {
    it('deve encontrar coluna por nome exato', () => {
      const headers = ['Condutor', 'CPF', 'Placa'];
      expect(encontrarColuna(headers, 'condutor')).toBe(0);
      expect(encontrarColuna(headers, 'cpf')).toBe(1);
    });

    it('deve encontrar coluna por sinônimo', () => {
      const headers = ['Tempo Jornada s/ Refeição', 'Início Jornada'];
      expect(encontrarColuna(headers, 'jornada_sem_refeicao')).toBe(0);
      expect(encontrarColuna(headers, 'inicio')).toBe(1);
    });

    it('deve retornar -1 para coluna não encontrada', () => {
      const headers = ['Condutor', 'CPF'];
      expect(encontrarColuna(headers, 'placa')).toBe(-1);
    });
  });

  describe('validarColunasObrigatorias', () => {
    it('deve validar colunas obrigatórias presentes', () => {
      const headers = ['Condutor', 'CPF', 'Placa', 'Tempo Jornada s/ Refeição', 'Início Jornada'];
      const result = validarColunasObrigatorias(headers);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('deve identificar colunas obrigatórias faltando', () => {
      const headers = ['Condutor', 'CPF'];
      const result = validarColunasObrigatorias(headers);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  // ===== TESTES DE VALIDAÇÃO COMPLETA =====

  describe('validarLinha', () => {
    it('deve validar linha com infrações e gerar advertência', () => {
      const row: ParsedRow = {
        condutor: 'JOSE ALVES',
        cpf: '123.456.789-00',
        placa: 'ABC1234',
        jornada_sem_refeicao: 540, // 09:00
        inicio: new Date('2026-06-02'),
        data: new Date('2026-06-02'),
        operacao: 'BRF Primária',
        cellColor: '#FFFF00',
      };

      const result = validarLinha(row, 1, '00.766.315/0001-44', 'Chapecó/SC', '1234567');
      expect(result).not.toBeNull();
      if (result) {
        expect(result.status).toBe('ADVERTENCIA');
        expect(result.infracos.length).toBeGreaterThan(0);
        expect(result.textoAdvertencia).toBeTruthy();
      }
    });

    it('deve marcar como CONFERENCIA_MANUAL se nenhuma infração', () => {
      const row: ParsedRow = {
        condutor: 'JOSE ALVES',
        cpf: '123.456.789-00',
        placa: 'ABC1234',
        jornada_sem_refeicao: 300, // 05:00 (dentro do limite)
        inicio: new Date('2026-06-02'),
        data: new Date('2026-06-02'),
        refeicao: 60, // OK
        intersticio: 660, // OK
      };

      const result = validarLinha(row);
      expect(result?.status).toBe('CONFERENCIA_MANUAL');
    });

    it('deve retornar EM_REVISAO para cor #FFCC00', () => {
      const row: ParsedRow = {
        condutor: 'JOSE ALVES',
        cpf: '123.456.789-00',
        placa: 'ABC1234',
        jornada_sem_refeicao: 540,
        inicio: new Date('2026-06-02'),
        data: new Date('2026-06-02'),
        cellColor: '#FFCC00',
      };

      const result = validarLinha(row);
      expect(result?.status).toBe('EM_REVISAO');
    });
  });

  // ===== TESTES DE TEXTO DA ADVERTÊNCIA =====

  describe('gerarTextoAdvertencia', () => {
    it('deve gerar texto com múltiplas infrações', () => {
      const row: ParsedRow = {
        condutor: 'JOSE ALVES',
        cpf: '12345678900',
        placa: 'ABC1234',
        jornada_sem_refeicao: 540,
        inicio: new Date('2026-06-02'),
        data: new Date('2026-06-02'),
        refeicao: 30,
        intersticio: 600,
      };

      const infracoes = detectarInfracoes(row);
      const diaInfo = parseDataAndDia(row.data);
      
      if (diaInfo) {
        const texto = gerarTextoAdvertencia(row, infracoes, diaInfo);
        expect(texto).toBeTruthy();
        expect(texto).toContain('jornada');
      }
    });
  });
});
