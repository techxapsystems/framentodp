const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export interface ParsedHourlyRecord {
  motoristaNome: string;
  cargo: string;
  cpf?: string;
  matricula?: string;
  data: Date;
  credito: number; // em minutos
  debito: number; // em minutos
  saldo: number; // em minutos
}

/**
 * Converte tempo em formato HH:MM ou (HH:MM) para minutos
 * Retorna número negativo se estiver entre parênteses
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr || timeStr.trim() === "-") return 0;
  
  const isNegative = timeStr.includes("(");
  const cleanStr = timeStr.replace(/[()]/g, "").trim();
  
  if (!cleanStr.match(/\d+:\d+/)) return 0;
  
  const parts = cleanStr.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const totalMinutes = hours * 60 + minutes;
  
  return isNegative ? -totalMinutes : totalMinutes;
}

/**
 * Extrai nome do motorista da linha de header
 */
function extractMotoristaName(line: string): string {
  const match = line.match(/^([A-Z\s]+?)\s+-\s+\d{3}\.\d{3}\.\d{3}-\d{2}/);
  return match ? match[1].trim() : "";
}

/**
 * Extrai cargo da linha de header
 */
function extractCargo(line: string): string {
  const match = line.match(/Função:\s*(.+?)(?:\s*$|$)/);
  return match ? match[1].trim() : "";
}

/**
 * Extrai CPF da linha de header
 */
function extractCpf(line: string): string | undefined {
  const match = line.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
  return match ? match[1] : undefined;
}

/**
 * Extrai matrícula da linha de header
 */
function extractMatricula(line: string): string | undefined {
  const match = line.match(/Matrícula:\s*(\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Parser robusto para PDF de Banco de Horas
 * Extrai dados estruturados do PDF
 */
export async function parseHourlyPdf(pdfBuffer: Buffer): Promise<ParsedHourlyRecord[]> {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  
  const records: ParsedHourlyRecord[] = [];
  const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l);
  
  let currentMotorista: {
    nome: string;
    cargo: string;
    cpf?: string;
    matricula?: string;
  } | null = null;
  
  let inTable = false;
  let currentDate: Date | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar header de motorista (NOME - CPF - Matrícula - Função)
    if (line.match(/^[A-Z\s]+-\s+\d{3}\.\d{3}\.\d{3}-\d{2}/) && line.includes("Função:")) {
      currentMotorista = {
        nome: extractMotoristaName(line),
        cargo: extractCargo(line),
        cpf: extractCpf(line),
        matricula: extractMatricula(line),
      };
      inTable = false;
      currentDate = null;
      continue;
    }
    
    // Detectar início da tabela
    if (line === "Analítico") {
      inTable = true;
      continue;
    }
    
    // Detectar fim da tabela
    if (line === "Resumo") {
      inTable = false;
      continue;
    }
    
    if (!inTable || !currentMotorista) continue;
    
    // Detectar linhas de data (formato DD/MM/YYYY)
    const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      currentDate = new Date(`${year}-${month}-${day}`);
      continue;
    }
    
    // Pular linhas que não têm dados de tempo
    if (!line.match(/\d{1,2}:\d{2}/)) continue;
    
    if (!currentDate || !currentMotorista) continue;
    
    // Extrair valores de tempo
    const timeValues = line.split(/\s+/).filter((v: string) => v.match(/\(?\d{1,2}:\d{2}\)?/) || v === "-");
    
    if (timeValues.length >= 3) {
      const credito = timeToMinutes(timeValues[0]);
      const debito = timeToMinutes(timeValues[1]);
      const saldo = timeToMinutes(timeValues[2]);
      
      records.push({
        motoristaNome: currentMotorista.nome,
        cargo: currentMotorista.cargo,
        cpf: currentMotorista.cpf,
        matricula: currentMotorista.matricula,
        data: new Date(currentDate),
        credito,
        debito,
        saldo,
      });
    }
  }
  
  return records;
}
