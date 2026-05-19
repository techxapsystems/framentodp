import { describe, it, expect } from "vitest";
import {
  detectarInfracoes,
  determinarNivelAdvertencia,
  gerarTextoAdvertencia,
  analisarMotorista,
  InfracaoTipo,
} from "./infractionEngine";
import { GroupedMotorista, ParsedImportRow } from "./bulkImportParser";

/**
 * Mock data para testes
 */
const createMockRow = (overrides?: Partial<ParsedImportRow>): ParsedImportRow => ({
  condutor: "João Silva",
  cpf: "123.456.789-00",
  cpfFormatado: "123.456.789-00",
  cpfLimpo: "12345678900",
  matricula: "MAT001",
  operacao: "BRF EMBU",
  cargo: "Motorista",
  placa: "ABC-1234",
  intersticio_horas: 11,
  inicioJornada: "01/01/2025 08:00",
  fimJornada: "01/01/2025 19:00",
  inicioJornadaDate: new Date("2025-01-01T08:00:00"),
  fimJornadaDate: new Date("2025-01-01T19:00:00"),
  totalRefeicao_horas: 1,
  tempoTotalDirigido_horas: 9,
  ...overrides,
});

const createMockMotorista = (
  linhas: ParsedImportRow[] = [createMockRow()]
): GroupedMotorista => ({
  cpfFormatado: "123.456.789-00",
  cpfLimpo: "12345678900",
  nome: "João Silva",
  operacao: "BRF EMBU",
  linhas,
});

describe("Infraction Engine - Detecção de Infrações", () => {
  it("deve detectar jornada excessiva (> 10h)", () => {
    const row = createMockRow({
      inicioJornadaDate: new Date("2025-01-01T08:00:00"),
      fimJornadaDate: new Date("2025-01-01T19:30:00"), // 11.5h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas).toHaveLength(1);
    expect(infracoesDetectadas[0].tipo).toBe(InfracaoTipo.JORNADA_EXCESSIVA);
    expect(infracoesDetectadas[0].valor).toBeGreaterThan(10);
  });

  it("deve detectar interstício insuficiente (< 11h)", () => {
    const row = createMockRow({
      intersticio_horas: 10, // < 11h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas.some((i) => i.tipo === InfracaoTipo.INTERSTICIO_INSUFICIENTE)).toBe(
      true
    );
  });

  it("deve detectar refeição insuficiente (< 1h)", () => {
    const row = createMockRow({
      totalRefeicao_horas: 0.5, // < 1h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas.some((i) => i.tipo === InfracaoTipo.REFEICAO_INSUFICIENTE)).toBe(
      true
    );
  });

  it("deve detectar tempo de direção excessivo (> 9h)", () => {
    const row = createMockRow({
      tempoTotalDirigido_horas: 9.5, // > 9h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas.some((i) => i.tipo === InfracaoTipo.TEMPO_DIRIGIDO_EXCESSIVO)).toBe(
      true
    );
  });

  it("não deve detectar infrações quando tudo está dentro dos limites", () => {
    const row = createMockRow({
      inicioJornadaDate: new Date("2025-01-01T08:00:00"),
      fimJornadaDate: new Date("2025-01-01T18:00:00"), // 10h exato
      intersticio_horas: 11, // = 11h
      totalRefeicao_horas: 1, // = 1h
      tempoTotalDirigido_horas: 9, // = 9h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas).toHaveLength(0);
  });

  it("deve detectar múltiplas infrações", () => {
    const row = createMockRow({
      inicioJornadaDate: new Date("2025-01-01T08:00:00"),
      fimJornadaDate: new Date("2025-01-01T20:00:00"), // 12h
      intersticio_horas: 9, // < 11h
      totalRefeicao_horas: 0.5, // < 1h
      tempoTotalDirigido_horas: 10, // > 9h
    });

    const motorista = createMockMotorista([row]);
    const infracoesDetectadas = detectarInfracoes(motorista);

    expect(infracoesDetectadas.length).toBeGreaterThan(1);
  });
});

describe("Infraction Engine - Nível de Advertência", () => {
  it("deve retornar nível 0 para sem infrações", () => {
    const nivel = determinarNivelAdvertencia([]);
    expect(nivel).toBe(0);
  });

  it("deve retornar nível 1 para 1 infração", () => {
    const infracoesDetectadas = [
      {
        tipo: InfracaoTipo.JORNADA_EXCESSIVA,
        descricao: "Jornada excessiva",
        valor: 11,
        limite: 10,
      },
    ];
    const nivel = determinarNivelAdvertencia(infracoesDetectadas);
    expect(nivel).toBe(1);
  });

  it("deve retornar nível 2 para 2 infrações", () => {
    const infracoesDetectadas = [
      {
        tipo: InfracaoTipo.JORNADA_EXCESSIVA,
        descricao: "Jornada excessiva",
        valor: 11,
        limite: 10,
      },
      {
        tipo: InfracaoTipo.INTERSTICIO_INSUFICIENTE,
        descricao: "Interstício insuficiente",
        valor: 10,
        limite: 11,
      },
    ];
    const nivel = determinarNivelAdvertencia(infracoesDetectadas);
    expect(nivel).toBe(2);
  });

  it("deve retornar nível 3 para 3+ infrações", () => {
    const infracoesDetectadas = [
      {
        tipo: InfracaoTipo.JORNADA_EXCESSIVA,
        descricao: "Jornada excessiva",
        valor: 11,
        limite: 10,
      },
      {
        tipo: InfracaoTipo.INTERSTICIO_INSUFICIENTE,
        descricao: "Interstício insuficiente",
        valor: 10,
        limite: 11,
      },
      {
        tipo: InfracaoTipo.REFEICAO_INSUFICIENTE,
        descricao: "Refeição insuficiente",
        valor: 0.5,
        limite: 1,
      },
    ];
    const nivel = determinarNivelAdvertencia(infracoesDetectadas);
    expect(nivel).toBe(3);
  });
});

describe("Infraction Engine - Geração de Texto", () => {
  it("deve gerar texto vazio para sem infrações", () => {
    const texto = gerarTextoAdvertencia([]);
    expect(texto).toBe("");
  });

  it("deve incluir descrições das infrações", () => {
    const infracoesDetectadas = [
      {
        tipo: InfracaoTipo.JORNADA_EXCESSIVA,
        descricao: "Jornada excessiva: 12h (limite: 10h)",
        valor: 12,
        limite: 10,
      },
    ];
    const texto = gerarTextoAdvertencia(infracoesDetectadas);

    expect(texto).toContain("Jornada excessiva: 12h (limite: 10h)");
    expect(texto).toContain("ARTIGOS INFRINGIDOS");
  });

  it("deve incluir artigos da CLT", () => {
    const infracoesDetectadas = [
      {
        tipo: InfracaoTipo.JORNADA_EXCESSIVA,
        descricao: "Jornada excessiva",
        valor: 11,
        limite: 10,
      },
    ];
    const texto = gerarTextoAdvertencia(infracoesDetectadas);

    expect(texto).toContain("Art. 58 da CLT");
  });
});

describe("Infraction Engine - Análise Completa", () => {
  it("deve analisar motorista com infrações", () => {
    const row = createMockRow({
      inicioJornadaDate: new Date("2025-01-01T08:00:00"),
      fimJornadaDate: new Date("2025-01-01T20:00:00"), // 12h
    });

    const motorista = createMockMotorista([row]);
    const analise = analisarMotorista(motorista);

    expect(analise.temInfracao).toBe(true);
    expect(analise.nivelAdvertencia).toBeGreaterThan(0);
    expect(analise.textoAdvertencia.length).toBeGreaterThan(0);
    expect(analise.infracoesDetectadas.length).toBeGreaterThan(0);
  });

  it("deve incluir dados do motorista na análise", () => {
    const row = createMockRow();
    const motorista = createMockMotorista([row]);
    const analise = analisarMotorista(motorista);

    expect(analise.cpf).toBe("123.456.789-00");
    expect(analise.nome).toBe("João Silva");
    expect(analise.operacao).toBe("BRF EMBU");
    expect(analise.placa).toBe("ABC-1234");
  });

  it("deve contar total de ocorrências", () => {
    const row1 = createMockRow();
    const row2 = createMockRow();
    const motorista = createMockMotorista([row1, row2]);
    const analise = analisarMotorista(motorista);

    expect(analise.totalOcorrencias).toBe(2);
  });
});
