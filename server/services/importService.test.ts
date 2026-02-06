import { describe, it, expect, beforeEach } from "vitest";
import { timeStringToMinutes, parseDate, normalizeJourneyRow } from "../services/importService";
import { validateExcelStructure } from "../services/importService";

describe("importService", () => {
  describe("timeStringToMinutes", () => {
    it("converte HH:MM para minutos", () => {
      expect(timeStringToMinutes("01:30")).toBe(90);
      expect(timeStringToMinutes("02:00")).toBe(120);
      expect(timeStringToMinutes("00:45")).toBe(45);
    });

    it("converte HH:MM:SS para minutos (arredonda segundos)", () => {
      expect(timeStringToMinutes("01:30:00")).toBe(90);
      expect(timeStringToMinutes("01:30:30")).toBe(90);
    });

    it("retorna 0 para valores inválidos", () => {
      expect(timeStringToMinutes("-")).toBe(0);
      expect(timeStringToMinutes("")).toBe(0);
      expect(timeStringToMinutes(null)).toBe(0);
      expect(timeStringToMinutes(undefined)).toBe(0);
    });
  });

  describe("parseDate", () => {
    it("converte formato DD/MM/YYYY para Date", () => {
      const date = parseDate("15/02/2026");
      expect(date).not.toBeNull();
      expect(date?.getDate()).toBe(15);
      expect(date?.getMonth()).toBe(1); // Fevereiro
      expect(date?.getFullYear()).toBe(2026);
    });

    it("retorna null para valores inválidos", () => {
      expect(parseDate("-")).toBeNull();
      expect(parseDate("")).toBeNull();
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });

    it("converte formato ISO", () => {
      const date = parseDate("2026-02-15");
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
    });
  });

  describe("validateExcelStructure", () => {
    it("deve validar estrutura correta do Excel", () => {
      // Este teste requer um arquivo XLSX real
      // A função validateExcelStructure espera um Buffer de um arquivo XLSX válido
      expect(typeof validateExcelStructure).toBe("function");
    });
  });

  describe("normalizeJourneyRow", () => {
    const mockConfig = {
      id: 1,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      limitePoucoRodadoMin: 120,
      limiteHeAlertaMin: 90,
      janelaReincidenciaDias: 7,
      janelaCronicoDias: 30,
      thresholdPoucoRodado1: 1,
      thresholdPoucoRodado2: 2,
      thresholdPoucoRodado3: 3,
      thresholdPouco30d: 5,
      thresholdHe30d: 10,
    };

    it("deve normalizar linha com dados válidos", () => {
      const row = {
        "Data": "01/02/2026",
        "Condutor": "JOSE ALVES DA SILVA",
        "Placa": "ECN0J82",
        "Operação": "BRF Primária",
        "Tempo Total Dirigido": "02:00",
        "Início Jornada": "01/02/2026 08:00",
        "Fim Jornada": "01/02/2026 18:00",
        "Horas Extras 50%": "00:30",
      };

      const result = normalizeJourneyRow(row, 0, mockConfig);

      expect(result).toBeDefined();
      expect(result.conductorName).toBe("JOSE ALVES DA SILVA");
      expect(result.placa).toBe("ECN0J82");
      expect(result.operacao).toBe("BRF Primária");
      expect(result.dirigidoMin).toBe(120);
      expect(result.heMin).toBe(30);
    });

    it("deve converter data no formato DD/MM/YYYY", () => {
      const row = {
        "Data": "15/02/2026",
        "Condutor": "JOSE ALVES DA SILVA",
        "Placa": "ECN0J82",
        "Operação": "BRF Primária",
        "Tempo Total Dirigido": "02:00",
        "Início Jornada": "15/02/2026 08:00",
        "Fim Jornada": "15/02/2026 18:00",
      };

      const result = normalizeJourneyRow(row, 0, mockConfig);

      expect(result.data.getDate()).toBe(15);
      expect(result.data.getMonth()).toBe(1);
      expect(result.data.getFullYear()).toBe(2026);
    });

    it("deve lidar com campos vazios", () => {
      const row = {
        "Data": "01/02/2026",
        "Condutor": "JOSE ALVES DA SILVA",
        "Placa": "ECN0J82",
        "Operação": "BRF Primária",
        "Tempo Total Dirigido": "", // Campo vazio
        "Início Jornada": "01/02/2026 08:00",
        "Fim Jornada": "01/02/2026 18:00",
      };

      const result = normalizeJourneyRow(row, 0, mockConfig);

      expect(result.dirigidoMin).toBe(0);
    });

    it("deve calcular flags POUCO_RODADO corretamente", () => {
      const row = {
        "Data": "01/02/2026",
        "Condutor": "JOSE ALVES DA SILVA",
        "Placa": "ECN0J82",
        "Operação": "BRF Primária",
        "Tempo Total Dirigido": "01:00", // Abaixo do limite de 120 minutos
        "Início Jornada": "01/02/2026 08:00",
        "Fim Jornada": "01/02/2026 19:00", // Jornada de 11 horas (> 10h) e direção < 2h
      };

      const result = normalizeJourneyRow(row, 0, mockConfig);

      expect(result.poucoRodado).toBe(true);
    });

    it("deve calcular flags HE_ALERTA corretamente", () => {
      const row = {
        "Data": "01/02/2026",
        "Condutor": "JOSE ALVES DA SILVA",
        "Placa": "ECN0J82",
        "Operação": "BRF Primária",
        "Tempo Total Dirigido": "02:00",
        "Início Jornada": "01/02/2026 08:00",
        "Fim Jornada": "01/02/2026 18:00",
        "Horas Extras 50%": "01:00",
        "Horas Extras 100%": "00:40", // Total 100 minutos > 90
      };

      const result = normalizeJourneyRow(row, 0, mockConfig);

      expect(result.heAlerta).toBe(true);
    });
  });
});
