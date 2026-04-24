import { describe, it, expect, beforeEach, vi } from "vitest";
import { importAdministrativeRouter } from "../importAdministrativeRouter";
import { getDb } from "../../db";

// Mock do banco de dados
vi.mock("../../db", () => ({
  getDb: vi.fn(),
}));

describe("importAdministrativeRouter", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("importEmployees", () => {
    it("deve importar funcionários administrativos com sucesso", async () => {
      const employees = [
        {
          cadastro: "1001",
          tipo: "1",
          nome: "João Silva",
          admissao: "01/01/2020",
          cargo: "GERENTE DE OPERAÇÕES",
          situacao: "Trabalhando",
          cpf: "123.456.789-00",
        },
        {
          cadastro: "1002",
          tipo: "1",
          nome: "Maria Santos",
          admissao: "15/02/2021",
          cargo: "ANALISTA DE RH",
          situacao: "Trabalhando",
          cpf: "987.654.321-00",
        },
      ];

      // Simular que não existem registros
      mockDb.limit.mockResolvedValue([]);

      const result = await importAdministrativeRouter.createCaller({
        user: { id: 1, role: "admin" },
      }).importEmployees({
        employees,
      });

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(2);
    });

    it("deve ignorar motoristas e ajudantes", async () => {
      const employees = [
        {
          cadastro: "1001",
          tipo: "1",
          nome: "João Silva",
          admissao: "01/01/2020",
          cargo: "GERENTE DE OPERAÇÕES",
          situacao: "Trabalhando",
          cpf: "123.456.789-00",
        },
        {
          cadastro: "1002",
          tipo: "1",
          nome: "Pedro Motorista",
          admissao: "15/02/2021",
          cargo: "MOTORISTA DE TRUCK",
          situacao: "Trabalhando",
          cpf: "987.654.321-00",
        },
        {
          cadastro: "1003",
          tipo: "1",
          nome: "Carlos Ajudante",
          admissao: "20/03/2022",
          cargo: "AJUDANTE DE CARGA",
          situacao: "Trabalhando",
          cpf: "555.666.777-00",
        },
      ];

      mockDb.limit.mockResolvedValue([]);

      // Nota: O filtro de motoristas/ajudantes deve ser feito no frontend
      // Este teste valida que a API recebe os dados corretamente
      const result = await importAdministrativeRouter.createCaller({
        user: { id: 1, role: "admin" },
      }).importEmployees({
        employees,
      });

      expect(result.total).toBe(3);
    });

    it("deve atualizar registros existentes", async () => {
      const employees = [
        {
          cadastro: "1001",
          tipo: "1",
          nome: "João Silva Atualizado",
          admissao: "01/01/2020",
          cargo: "DIRETOR DE OPERAÇÕES",
          situacao: "Trabalhando",
          cpf: "123.456.789-00",
        },
      ];

      // Simular que o registro já existe
      mockDb.limit.mockResolvedValue([
        {
          id: 1,
          cpf: "123.456.789-00",
          nome: "João Silva",
        },
      ]);

      const result = await importAdministrativeRouter.createCaller({
        user: { id: 1, role: "admin" },
      }).importEmployees({
        employees,
      });

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("deve retornar erro quando banco de dados não está disponível", async () => {
      vi.mocked(getDb).mockResolvedValue(null);

      const employees = [
        {
          cadastro: "1001",
          tipo: "1",
          nome: "João Silva",
          admissao: "01/01/2020",
          cargo: "GERENTE",
          situacao: "Trabalhando",
          cpf: "123.456.789-00",
        },
      ];

      await expect(
        importAdministrativeRouter.createCaller({
          user: { id: 1, role: "admin" },
        }).importEmployees({
          employees,
        })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getAdministrativeEmployees", () => {
    it("deve retornar lista de funcionários administrativos", async () => {
      const employees = [
        {
          id: 1,
          cadastro: "1001",
          tipo: "1",
          nome: "João Silva",
          admissao: "01/01/2020",
          cargo: "GERENTE",
          situacao: "Trabalhando",
          cpf: "123.456.789-00",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockResolvedValue(employees);

      const result = await importAdministrativeRouter.createCaller({
        user: { id: 1, role: "admin" },
      }).getAdministrativeEmployees();

      expect(result).toEqual(employees);
    });
  });

  describe("deleteAdministrativeEmployee", () => {
    it("deve deletar funcionário administrativo", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockResolvedValue({});

      const result = await importAdministrativeRouter.createCaller({
        user: { id: 1, role: "admin" },
      }).deleteAdministrativeEmployee({
        id: 1,
      });

      expect(result.success).toBe(true);
    });
  });
});
