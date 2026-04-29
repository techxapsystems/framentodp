import { describe, it, expect } from "vitest";
import { generateWarningPDF } from "./pdfService";

describe("PDF Generation Service", () => {
  const testData = {
    type: "suspensao" as const,
    employeeName: "DOUGLAS LUIS CALIXTO ARAUJO DA SILVA",
    employeeCPF: "140.382.477-08",
    employeeCTPS: "123456    1234 - 5",
    licensePlate: "MKL7451",
    operation: "BRF RJ",
    infringementDate: "27/04/2026",
    reason: "Falta injustificada",
    description:
      "A Transportes Framento, com fundamento no artigo 482, alíneas e e h...",
    penaltyType: "Suspensão",
    penaltyDuration: "3 dias",
    startDate: "30/04/2026",
    endDate: "02/05/2026",
    returnDate: "03/05/2026",
    companyName: "TRANSPORTES FRAMENTO LTDA",
    companyAddress: "Contorno da Petrobras, 107",
    companyCNPJ: "00.766.315/0009-00",
    companyCity: "CHAPECÓ",
    signatureDate: "29 de abril de 2026",
  };

  it("should generate a PDF buffer", async () => {
    const buffer = await generateWarningPDF(testData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate PDF with correct size", async () => {
    const buffer = await generateWarningPDF(testData);
    // PDF should be at least 2KB
    expect(buffer.length).toBeGreaterThan(2000);
  });

  it("should handle ISO date format", async () => {
    const dataWithISODates = {
      ...testData,
      startDate: "2026-04-30T00:00:00.000Z",
      endDate: "2026-05-02T00:00:00.000Z",
      returnDate: "2026-05-03T00:00:00.000Z",
    };

    const buffer = await generateWarningPDF(dataWithISODates);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate PDF for advertencia type", async () => {
    const advertenciaData = {
      ...testData,
      type: "advertencia" as const,
    };

    const buffer = await generateWarningPDF(advertenciaData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should handle missing optional company fields", async () => {
    const minimalData = {
      ...testData,
      companyName: undefined,
      companyAddress: undefined,
      companyCNPJ: undefined,
      companyCity: undefined,
    };

    const buffer = await generateWarningPDF(minimalData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
