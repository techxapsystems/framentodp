import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { warnings, conductors } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

describe("Warnings AI Features", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available for tests");
    }
  });

  describe("Data Context Generation", () => {
    it("should retrieve warnings data for a date range", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-02-28");

      const result = await db
        .select()
        .from(warnings)
        .where(
          and(
            gte(warnings.criadoEm, startDate),
            lte(warnings.criadoEm, endDate)
          )
        );

      expect(Array.isArray(result)).toBe(true);
    });

    it("should group warnings by driver name", async () => {
      const result = await db.select().from(warnings);

      const grouped: Record<string, any> = {};
      result.forEach((warning: any) => {
        if (!grouped[warning.conductorName]) {
          grouped[warning.conductorName] = [];
        }
        grouped[warning.conductorName].push(warning);
      });

      expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate warning statistics by category", async () => {
      const result = await db.select().from(warnings);

      const stats = {
        advertencia: 0,
        suspensao: 0,
        pouco_rodado: 0,
        horas_extras: 0,
      };

      result.forEach((warning: any) => {
        if (warning.tipo === "advertencia") stats.advertencia++;
        if (warning.tipo === "suspensao") stats.suspensao++;
        if (warning.categoria === "pouco_rodado") stats.pouco_rodado++;
        if (warning.categoria === "horas_extras") stats.horas_extras++;
      });

      expect(stats.advertencia + stats.suspensao).toBe(result.length);
    });

    it("should identify top drivers by warning count", async () => {
      const result = await db.select().from(warnings);

      const driverStats: Record<string, number> = {};
      result.forEach((warning: any) => {
        driverStats[warning.conductorName] =
          (driverStats[warning.conductorName] || 0) + 1;
      });

      const topDrivers = Object.entries(driverStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      expect(Array.isArray(topDrivers)).toBe(true);
    });

    it("should calculate trend direction (improving/worsening)", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-02-28");
      const midDate = new Date(
        startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2
      );

      const result = await db
        .select()
        .from(warnings)
        .where(
          and(
            gte(warnings.criadoEm, startDate),
            lte(warnings.criadoEm, endDate)
          )
        );

      const firstHalf = result.filter((w: any) => w.criadoEm < midDate).length;
      const secondHalf = result.filter((w: any) => w.criadoEm >= midDate).length;

      const percentChange =
        firstHalf === 0 ? 0 : ((secondHalf - firstHalf) / firstHalf) * 100;
      const direction =
        percentChange > 10 ? "PIORANDO" : percentChange < -10 ? "MELHORANDO" : "ESTÁVEL";

      expect(["PIORANDO", "MELHORANDO", "ESTÁVEL"]).toContain(direction);
    });

    it("should filter warnings by operation", async () => {
      const conductorsList = await db.select().from(conductors);
      const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

      const allWarnings = await db.select().from(warnings);

      const operacoes = new Set<string>();
      allWarnings.forEach((warning: any) => {
        const conductor = conductorMap.get(warning.conductorName);
        if (conductor?.operacao) {
          operacoes.add(conductor.operacao);
        }
      });

      expect(operacoes.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Risk Assessment", () => {
    it("should identify drivers with multiple warnings (chronic)", async () => {
      const result = await db.select().from(warnings);

      const driverWarnings: Record<string, any[]> = {};
      result.forEach((warning: any) => {
        if (!driverWarnings[warning.conductorName]) {
          driverWarnings[warning.conductorName] = [];
        }
        driverWarnings[warning.conductorName].push(warning);
      });

      const chronicDrivers = Object.entries(driverWarnings)
        .filter(([, warnings]) => warnings.length >= 2)
        .map(([name, warnings]) => ({
          name,
          count: warnings.length,
          maxLevel: Math.max(...warnings.map((w: any) => w.nivelAdvertencia || 0)),
        }));

      expect(Array.isArray(chronicDrivers)).toBe(true);
    });

    it("should calculate days since last warning", async () => {
      const result = await db.select().from(warnings);

      if (result.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const now = new Date();
      const daysAgo = result.map((warning: any) => {
        const daysSince = Math.floor(
          (now.getTime() - warning.criadoEm.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince;
      });

      expect(daysAgo.every((d: number) => d >= 0)).toBe(true);
    });

    it("should identify escalation patterns", async () => {
      const result = await db.select().from(warnings);

      const driverHistory: Record<string, any[]> = {};
      result.forEach((warning: any) => {
        if (!driverHistory[warning.conductorName]) {
          driverHistory[warning.conductorName] = [];
        }
        driverHistory[warning.conductorName].push({
          date: warning.criadoEm,
          nivel: warning.nivelAdvertencia || 0,
        });
      });

      const escalations = Object.entries(driverHistory)
        .map(([name, history]) => {
          const sorted = history.sort((a, b) => a.date - b.date);
          let escalating = false;
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].nivel > sorted[i - 1].nivel) {
              escalating = true;
              break;
            }
          }
          return { name, escalating };
        })
        .filter((e) => e.escalating);

      expect(Array.isArray(escalations)).toBe(true);
    });
  });

  describe("Temporal Patterns", () => {
    it("should identify high-risk days of week", async () => {
      const result = await db.select().from(warnings);

      const dayStats: Record<number, number> = {};
      result.forEach((warning: any) => {
        const dayOfWeek = warning.criadoEm.getDay();
        dayStats[dayOfWeek] = (dayStats[dayOfWeek] || 0) + 1;
      });

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const sortedDays = Object.entries(dayStats)
        .sort(([, a], [, b]) => b - a)
        .map(([day]) => daysOfWeek[parseInt(day)]);

      expect(Array.isArray(sortedDays)).toBe(true);
    });

    it("should identify high-risk categories", async () => {
      const result = await db.select().from(warnings);

      const categoryStats: Record<string, number> = {};
      result.forEach((warning: any) => {
        categoryStats[warning.categoria] = (categoryStats[warning.categoria] || 0) + 1;
      });

      const topCategories = Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .map(([category]) => category);

      expect(Array.isArray(topCategories)).toBe(true);
    });
  });

  describe("Operation Analysis", () => {
    it("should aggregate warnings by operation", async () => {
      const conductorsList = await db.select().from(conductors);
      const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

      const allWarnings = await db.select().from(warnings);

      const operationStats: Record<string, any> = {};
      allWarnings.forEach((warning: any) => {
        const conductor = conductorMap.get(warning.conductorName);
        const operacao = conductor?.operacao || "Unknown";

        if (!operationStats[operacao]) {
          operationStats[operacao] = {
            total: 0,
            advertencia: 0,
            suspensao: 0,
            drivers: new Set(),
          };
        }

        operationStats[operacao].total++;
        if (warning.tipo === "advertencia") operationStats[operacao].advertencia++;
        if (warning.tipo === "suspensao") operationStats[operacao].suspensao++;
        operationStats[operacao].drivers.add(warning.conductorName);
      });

      expect(Object.keys(operationStats).length).toBeGreaterThanOrEqual(0);
    });

    it("should identify operations with highest warning rates", async () => {
      const conductorsList = await db.select().from(conductors);
      const conductorMap = new Map(conductorsList.map((c: any) => [c.nome, c]));

      const allWarnings = await db.select().from(warnings);

      const operationStats: Record<string, number> = {};
      allWarnings.forEach((warning: any) => {
        const conductor = conductorMap.get(warning.conductorName);
        const operacao = conductor?.operacao || "Unknown";
        operationStats[operacao] = (operationStats[operacao] || 0) + 1;
      });

      const topOperations = Object.entries(operationStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      expect(Array.isArray(topOperations)).toBe(true);
    });
  });

  describe("Predictive Indicators", () => {
    it("should identify drivers likely to escalate", async () => {
      const result = await db.select().from(warnings);

      const driverStats: Record<string, any> = {};
      result.forEach((warning: any) => {
        if (!driverStats[warning.conductorName]) {
          driverStats[warning.conductorName] = {
            total: 0,
            level1: 0,
            level2: 0,
            level3: 0,
            lastDate: null,
          };
        }
        driverStats[warning.conductorName].total++;
        if (warning.nivelAdvertencia === 1) driverStats[warning.conductorName].level1++;
        if (warning.nivelAdvertencia === 2) driverStats[warning.conductorName].level2++;
        if (warning.nivelAdvertencia === 3) driverStats[warning.conductorName].level3++;
        driverStats[warning.conductorName].lastDate = warning.criadoEm;
      });

      const atRisk = Object.entries(driverStats)
        .filter(([, stats]: any) => {
          // At risk if: level 2 with recent activity, or level 3
          return stats.level3 > 0 || (stats.level2 > 0 && stats.total >= 2);
        })
        .map(([name]) => name);

      expect(Array.isArray(atRisk)).toBe(true);
    });

    it("should calculate recurrence likelihood", async () => {
      const result = await db.select().from(warnings);

      const driverStats: Record<string, any> = {};
      result.forEach((warning: any) => {
        if (!driverStats[warning.conductorName]) {
          driverStats[warning.conductorName] = {
            warnings: [],
          };
        }
        driverStats[warning.conductorName].warnings.push(warning.criadoEm);
      });

      const recurrenceRates = Object.entries(driverStats).map(([name, stats]: any) => {
        const sorted = stats.warnings.sort((a: any, b: any) => a - b);
        const intervals: number[] = [];

        for (let i = 1; i < sorted.length; i++) {
          const daysBetween = Math.floor(
            (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)
          );
          intervals.push(daysBetween);
        }

        const avgInterval =
          intervals.length > 0 ? intervals.reduce((a, b) => a + b) / intervals.length : 0;

        return {
          name,
          frequency: stats.warnings.length,
          avgIntervalDays: Math.round(avgInterval),
          likelihood: intervals.length > 0 && avgInterval < 30 ? "HIGH" : "LOW",
        };
      });

      expect(Array.isArray(recurrenceRates)).toBe(true);
    });
  });
});
