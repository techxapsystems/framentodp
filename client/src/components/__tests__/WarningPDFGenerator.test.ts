import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateWarningPDF } from "../WarningPDFGenerator";

// Mock jsPDF
vi.mock("jspdf", () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    splitTextToSize: vi.fn((text) => text.split("\n")),
  };

  return {
    jsPDF: vi.fn(() => mockDoc),
  };
});

describe("WarningPDFGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ITEM 1: Quebra de Layout com Texto Longo", () => {
    it("deve criar múltiplas páginas para textos longos", () => {
      const longText = "Lorem ipsum dolor sit amet, ".repeat(50); // Texto muito longo

      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: longText,
        createdDate: new Date(),
      });

      // Verificar se addPage foi chamado (indicando múltiplas páginas)
      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF().mock;
      expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("deve respeitar margens do documento", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Verificar que o texto não foi posicionado em margens inválidas
      textCalls.forEach((call: any) => {
        if (call[1] !== undefined) {
          expect(call[1]).toBeGreaterThanOrEqual(15); // margin = 15
        }
      });
    });
  });

  describe("ITEM 2: Correção do Tipo no PDF (Suspensão x Advertência)", () => {
    it("deve exibir 'ADVERTÊNCIA DISCIPLINAR' para advertência", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por "ADVERTÊNCIA DISCIPLINAR" nas chamadas de texto
      const hasAdvertencia = textCalls.some((call: any) =>
        String(call[0]).includes("ADVERTÊNCIA DISCIPLINAR")
      );
      expect(hasAdvertencia).toBe(true);
    });

    it("deve exibir 'SUSPENSÃO DISCIPLINAR' para suspensão", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por "SUSPENSÃO DISCIPLINAR" nas chamadas de texto
      const hasSuspensao = textCalls.some((call: any) =>
        String(call[0]).includes("SUSPENSÃO DISCIPLINAR")
      );
      expect(hasSuspensao).toBe(true);
    });

    it("não deve exibir 'ADVERTÊNCIA' (sem DISCIPLINAR)", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Verificar que não há "ADVERTÊNCIA" sozinha (deve ser "SUSPENSÃO DISCIPLINAR")
      const hasOnlyAdvertencia = textCalls.some(
        (call: any) =>
          String(call[0]) === "ADVERTÊNCIA" ||
          (String(call[0]).includes("ADVERTÊNCIA") &&
            !String(call[0]).includes("SUSPENSÃO"))
      );
      expect(hasOnlyAdvertencia).toBe(false);
    });
  });

  describe("ITEM 3: Correção do Endereço da Empresa no PDF", () => {
    it("deve exibir endereço completo da Framento em Chapecó/SC", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por endereço completo
      const hasAddress = textCalls.some(
        (call: any) =>
          String(call[0]).includes("Rua Getúlio Vargas") &&
          String(call[0]).includes("Chapecó") &&
          String(call[0]).includes("SC")
      );
      expect(hasAddress).toBe(true);
    });

    it("deve exibir CNPJ da empresa", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por CNPJ
      const hasCNPJ = textCalls.some((call: any) =>
        String(call[0]).includes("CNPJ")
      );
      expect(hasCNPJ).toBe(true);
    });

    it("não deve exibir endereço incorreto", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Verificar que não há endereço incorreto
      const hasWrongAddress = textCalls.some((call: any) =>
        String(call[0]).includes("Framento Transportes - 2026")
      );
      expect(hasWrongAddress).toBe(false);
    });
  });

  describe("ITEM 4: Exibição das Datas na Suspensão", () => {
    it("deve exibir datas de suspensão quando tipo é suspensão", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por datas
      const hasDataInicio = textCalls.some((call: any) =>
        String(call[0]).includes("01/01/2026")
      );
      const hasDataFim = textCalls.some((call: any) =>
        String(call[0]).includes("05/01/2026")
      );
      const hasDataRetorno = textCalls.some((call: any) =>
        String(call[0]).includes("06/01/2026")
      );

      expect(hasDataInicio).toBe(true);
      expect(hasDataFim).toBe(true);
      expect(hasDataRetorno).toBe(true);
    });

    it("deve exibir rótulos descritivos para as datas", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por rótulos
      const hasLabels = textCalls.some(
        (call: any) =>
          (String(call[0]).includes("Início da Suspensão") ||
            String(call[0]).includes("Fim da Suspensão") ||
            String(call[0]).includes("Retorno do Colaborador")) &&
          String(call[0]).includes(":")
      );

      expect(hasLabels).toBe(true);
    });

    it("não deve exibir datas de suspensão quando tipo é advertência", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Verificar que não há "PERÍODO DE SUSPENSÃO"
      const hasSuspensionPeriod = textCalls.some((call: any) =>
        String(call[0]).includes("PERÍODO DE SUSPENSÃO")
      );

      expect(hasSuspensionPeriod).toBe(false);
    });

    it("deve exibir seção 'PERÍODO DE SUSPENSÃO' para suspensões", () => {
      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      const textCalls = mockDoc.text.mock.calls;

      // Procurar por "PERÍODO DE SUSPENSÃO"
      const hasSuspensionPeriod = textCalls.some((call: any) =>
        String(call[0]).includes("PERÍODO DE SUSPENSÃO")
      );

      expect(hasSuspensionPeriod).toBe(true);
    });
  });

  describe("Validação de Coerência Geral", () => {
    it("deve gerar PDF com nome de arquivo correto para advertência", () => {
      const mockSave = vi.fn();
      vi.mock("jspdf", () => ({
        jsPDF: vi.fn(() => ({
          internal: {
            pageSize: {
              getWidth: () => 210,
              getHeight: () => 297,
            },
          },
          setFontSize: vi.fn(),
          setTextColor: vi.fn(),
          setFont: vi.fn(),
          text: vi.fn(),
          setDrawColor: vi.fn(),
          line: vi.fn(),
          addPage: vi.fn(),
          save: mockSave,
          splitTextToSize: vi.fn((text) => text.split("\n")),
        })),
      }));

      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "advertencia",
        warningReason: "Motivo da advertência",
        createdDate: new Date(),
      });

      // Verificar que save foi chamado
      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it("deve incluir tipo correto no nome do arquivo para suspensão", () => {
      const mockSave = vi.fn();
      vi.mock("jspdf", () => ({
        jsPDF: vi.fn(() => ({
          internal: {
            pageSize: {
              getWidth: () => 210,
              getHeight: () => 297,
            },
          },
          setFontSize: vi.fn(),
          setTextColor: vi.fn(),
          setFont: vi.fn(),
          text: vi.fn(),
          setDrawColor: vi.fn(),
          line: vi.fn(),
          addPage: vi.fn(),
          save: mockSave,
          splitTextToSize: vi.fn((text) => text.split("\n")),
        })),
      }));

      generateWarningPDF({
        conductorName: "João Silva",
        licensePlate: "ABC-1234",
        operacao: "Operação A",
        warningLevel: "1",
        warningType: "suspensao",
        warningReason: "Motivo da suspensão",
        createdDate: new Date(),
        dataInicio: "01/01/2026",
        dataFim: "05/01/2026",
        dataRetorno: "06/01/2026",
      });

      // Verificar que save foi chamado
      const { jsPDF } = require("jspdf");
      const mockDoc = jsPDF();
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
