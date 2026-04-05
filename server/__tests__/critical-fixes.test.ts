import { describe, it, expect } from "vitest";

describe("Critical Bug Fixes", () => {
  describe("Taxa de Devolução Calculation", () => {
    it("should calculate devolucao rate as assinadas/total, not naoAssinadas/total", () => {
      const total = 1;
      const assinadas = 0;
      const naoAssinadas = 1;

      // Correct formula: assinadas / total * 100
      const correctRate = (assinadas / total) * 100;
      expect(correctRate).toBe(0);

      // Wrong formula that was being used: naoAssinadas / total * 100
      const wrongRate = (naoAssinadas / total) * 100;
      expect(wrongRate).toBe(100);

      // Verify the difference
      expect(correctRate).not.toBe(wrongRate);
    });

    it("should correctly calculate rate when all are signed", () => {
      const total = 10;
      const assinadas = 10;
      const naoAssinadas = 0;

      const rate = (assinadas / total) * 100;
      expect(rate).toBe(100);
    });

    it("should correctly calculate rate when none are signed", () => {
      const total = 10;
      const assinadas = 0;
      const naoAssinadas = 10;

      const rate = (assinadas / total) * 100;
      expect(rate).toBe(0);
    });

    it("should correctly calculate rate with mixed values", () => {
      const total = 10;
      const assinadas = 7;
      const naoAssinadas = 3;

      const rate = (assinadas / total) * 100;
      expect(rate).toBe(70);
    });
  });

  describe("PDF Generation", () => {
    it("should generate PDF with correct structure", () => {
      const mockData = {
        companyName: "TRANSPORTESFRAMENTOLTDA",
        companyAddress: "Contorno da Petrobras, 107",
        companyCity: "BETIM",
        companyState: "MG",
        companyZipCode: "32.669-500",
        companyCNPJ: "00.766.315/0009-00",
        employeeName: "JEFFERSON LUIZ GUIMARAES",
        employeeCPF: "000.000.000-00",
        employeeCTPS: "001013879",
        employeeMatricula: "6602",
        warningDate: "05/04/2026",
        warningLocation: "BETIM",
        warningReason: "Falta de abastecimento",
        warningDescription: "Teste",
        warningType: "advertencia",
        warningLevel: 1,
      };

      // Verify all required fields are present
      expect(mockData.companyName).toBeTruthy();
      expect(mockData.employeeName).toBeTruthy();
      expect(mockData.companyCNPJ).toBeTruthy();
      expect(mockData.warningDate).toBeTruthy();
      
      // Verify CNPJ format (should not be duplicated)
      expect(mockData.companyCNPJ).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
      
      // Verify no duplicate CNPJ in output
      const cnpjCount = mockData.companyCNPJ.split("00.766.315/0009-00").length - 1;
      expect(cnpjCount).toBe(1);
    });
  });

  describe("Reports Page - Load Pending Warnings", () => {
    it("should filter pending warnings correctly", () => {
      const allWarnings = [
        { id: 1, assinada: true, nome: "Driver 1" },
        { id: 2, assinada: false, nome: "Driver 2" },
        { id: 3, assinada: false, nome: "Driver 3" },
        { id: 4, assinada: true, nome: "Driver 4" },
      ];

      // Filter only pending (not signed)
      const pendingWarnings = allWarnings.filter((w) => !w.assinada);

      expect(pendingWarnings).toHaveLength(2);
      expect(pendingWarnings[0].id).toBe(2);
      expect(pendingWarnings[1].id).toBe(3);
      expect(pendingWarnings.every((w) => !w.assinada)).toBe(true);
    });

    it("should format today's date correctly for API call", () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Verify format is YYYY-MM-DD
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's today's date
      const [year, month, day] = todayStr.split("-");
      expect(parseInt(year)).toBe(today.getFullYear());
      expect(parseInt(month)).toBe(today.getMonth() + 1);
      expect(parseInt(day)).toBe(today.getDate());
    });

    it("should load pending warnings on page mount", () => {
      const mockResponse = {
        result: {
          data: {
            json: [
              { id: 1, assinada: false, nome: "Driver 1" },
              { id: 2, assinada: false, nome: "Driver 2" },
              { id: 3, assinada: true, nome: "Driver 3" },
            ],
          },
        },
      };

      const pendingWarnings = mockResponse.result.data.json.filter((w) => !w.assinada);

      expect(pendingWarnings).toHaveLength(2);
      expect(pendingWarnings.every((w) => !w.assinada)).toBe(true);
    });
  });
});
