import { describe, it, expect } from "vitest";
import { timeStringToMinutes, parseDate } from "../services/importService";

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
});
