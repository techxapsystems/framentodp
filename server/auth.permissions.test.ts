import { describe, it, expect } from "vitest";

// Simular estrutura de usuário
type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  department: string;
  modules: string;
};

// Função para verificar permissão
function hasModuleAccess(user: User | null, requiredModule: string): boolean {
  if (!user) return false;

  // Admin tem acesso a tudo
  if (user.role === "admin") return true;

  // Usuário comum: verificar módulos
  try {
    const userModules = JSON.parse(user.modules);
    return userModules.includes(requiredModule);
  } catch {
    return false;
  }
}

describe("User Permissions", () => {
  const giovana: User = {
    id: 1,
    name: "Giovana Lucatteli",
    email: "giovana.lucatteli@transframento.com",
    role: "user",
    department: "dp",
    modules: JSON.stringify(["advertencias"]),
  };

  const gabriel: User = {
    id: 2,
    name: "Gabriel Ferreira",
    email: "gabriel.ferreira@transframento.com.br",
    role: "admin",
    department: "geral",
    modules: JSON.stringify([
      "ociosidade",
      "jornada",
      "advertencias",
      "orientacoes",
      "relatorios",
      "configuracoes",
    ]),
  };

  describe("Giovana (DP - Limited Access)", () => {
    it("should have access to advertencias module", () => {
      expect(hasModuleAccess(giovana, "advertencias")).toBe(true);
    });

    it("should NOT have access to ociosidade module", () => {
      expect(hasModuleAccess(giovana, "ociosidade")).toBe(false);
    });

    it("should NOT have access to jornada module", () => {
      expect(hasModuleAccess(giovana, "jornada")).toBe(false);
    });

    it("should NOT have access to relatorios module", () => {
      expect(hasModuleAccess(giovana, "relatorios")).toBe(false);
    });
  });

  describe("Gabriel (Admin - Full Access)", () => {
    it("should have access to all modules", () => {
      expect(hasModuleAccess(gabriel, "advertencias")).toBe(true);
      expect(hasModuleAccess(gabriel, "ociosidade")).toBe(true);
      expect(hasModuleAccess(gabriel, "jornada")).toBe(true);
      expect(hasModuleAccess(gabriel, "relatorios")).toBe(true);
      expect(hasModuleAccess(gabriel, "orientacoes")).toBe(true);
      expect(hasModuleAccess(gabriel, "configuracoes")).toBe(true);
    });

    it("should have access to any module", () => {
      expect(hasModuleAccess(gabriel, "unknown_module")).toBe(true);
    });
  });

  describe("Null User", () => {
    it("should NOT have access to any module", () => {
      expect(hasModuleAccess(null, "advertencias")).toBe(false);
      expect(hasModuleAccess(null, "ociosidade")).toBe(false);
    });
  });

  describe("Module Parsing", () => {
    it("should handle invalid JSON in modules field", () => {
      const invalidUser: User = {
        id: 3,
        name: "Test User",
        email: "test@example.com",
        role: "user",
        department: "test",
        modules: "invalid json",
      };

      expect(hasModuleAccess(invalidUser, "advertencias")).toBe(false);
    });

    it("should handle empty modules array", () => {
      const emptyUser: User = {
        id: 4,
        name: "Empty User",
        email: "empty@example.com",
        role: "user",
        department: "test",
        modules: JSON.stringify([]),
      };

      expect(hasModuleAccess(emptyUser, "advertencias")).toBe(false);
    });
  });
});
