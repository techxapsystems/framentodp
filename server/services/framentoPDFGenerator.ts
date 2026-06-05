/**
 * FRAMENTO PDF GENERATOR
 * Gera PDFs de advertências conforme template oficial da Framento
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { WarningData } from './framentoRulesEngine';

export interface PDFGeneratorOptions {
  numero_protocolo: string;
  cnpj: string;
  endereco: string;
  nome_empregado: string;
  cpf: string;
  ctps?: string;
  data_emissao: Date;
  data_analise: Date;
  jornada: string; // HHhMM
  intersticio?: string; // HHhMM
  refeicao?: string; // HHhMM
  temJornada: boolean;
  temIntersticio: boolean;
  temRefeicao: boolean;
  refeicaoAusente: boolean;
  textoAdvertencia: string;
}

/**
 * Gera PDF de advertência conforme template oficial
 */
export async function generateWarningPDF(options: PDFGeneratorOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  
  const { width, height } = page.getSize();
  const margin = 40;
  const lineHeight = 14;
  let yPosition = height - margin;
  
  // Função auxiliar para desenhar texto
  const drawText = (text: string, size: number = 11, bold: boolean = false, x: number = margin) => {
    page.drawText(text, {
      x,
      y: yPosition,
      size,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };
  
  const drawMultilineText = (text: string, size: number = 11, maxWidth: number = width - margin * 2) => {
    const words = text.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = testLine.length * size * 0.5; // Aproximação
      
      if (textWidth > maxWidth && line) {
        drawText(line, size);
        line = word;
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      drawText(line, size);
    }
  };
  
  // CABEÇALHO
  drawText('Advertência Disciplinar', 14, true);
  drawText(`Nº ${options.numero_protocolo}`, 11, true);
  yPosition -= 5;
  
  drawText('Empresa: TRANSPORTES FRAMENTO LTDA', 11);
  drawText(`CNPJ: ${options.cnpj}`, 11);
  drawText(options.endereco, 11);
  drawText(`Empregado: ${options.nome_empregado}`, 11);
  drawText(`CPF: ${options.cpf}`, 11);
  if (options.ctps) {
    drawText(`CTPS: ${options.ctps}`, 11);
  }
  
  yPosition -= 10;
  
  const dataEmissao = formatDataExtensa(options.data_emissao);
  drawText(`CHAPECO, ${dataEmissao}.`, 11);
  drawText('Favor dar ciente na cópia desta.', 11);
  
  yPosition -= 15;
  
  // CORPO
  drawText('Tem esta a finalidade de aplicar-lhe a pena de advertência disciplinar, em razão da(s) seguinte(s) ocorrência(a):', 11);
  
  yPosition -= 5;
  
  const dataAnalise = formatDataExtensa(options.data_analise);
  drawText(`Apos analise realizada no dia ${dataAnalise}.`, 11);
  
  yPosition -= 10;
  
  // Parágrafo principal
  const paragrafoPrincipal = `A empresa Transportes Framento, no exercício regular de seu poder diretivo e disciplinar, conforme disposto no artigo 2º da Consolidação das Leis do Trabalho (CLT), vem, por meio deste documento, aplicar ADVERTÊNCIA FORMAL a Vossa Senhoria, na função de motorista profissional, pelos fatos que seguem. Durante análise de sua jornada de trabalho das últimas duas semanas, foram identificadas as seguintes irregularidades: ${options.textoAdvertencia} Tais condutas configuram descumprimento de obrigações contratuais e ato de indisciplina, nos termos do artigo 482, alíneas "h" (indisciplina ou insubordinação) da CLT, além de descumprir as normas internas da empresa. Diante do exposto, a empresa ADVERTE formalmente Vossa Senhoria, solicitando o imediato ajuste de conduta e o cumprimento rigoroso dos horários estabelecidos em contrato e orientações internas. Em caso de reincidência, será aplicado sanções mais severas, conforme previsto na legislação vigente e nas normas da empresa. Ressalta-se que esta medida está sendo adotada em conformidade com o princípio da imediatidade da ação disciplinar. Solicita-se que Vossa Senhoria assine o presente documento, declarando ciência de seu conteúdo. Em caso de recusa, a empresa procederá com o registro da entrega por meio da assinatura de duas testemunhas, conforme previsto em norma interna.`;
  
  drawMultilineText(paragrafoPrincipal, 10);
  
  yPosition -= 10;
  
  // Parágrafo final
  const paragrafoFinal = `Esclarecemos, ainda, que a repetição de procedimentos como este(s) poderá ser considerada como ato faltoso, passível de dispensa por Justa Causa. Para que não tenhamos, no futuro, de tomar as medidas que nos facultam a legislação vigente, solicitamos-lhe que observe as normas reguladoras da relação de emprego.`;
  
  drawMultilineText(paragrafoFinal, 10);
  
  yPosition -= 20;
  
  // ASSINATURAS
  drawText('TRANSPORTES FRAMENTO LTDA                    ' + options.nome_empregado, 11);
  
  yPosition -= 30;
  
  // RODAPÉ TÉCNICO
  const now = new Date();
  const dataHora = `${now.toLocaleDateString('pt-BR')} - ${now.toLocaleTimeString('pt-BR')}`;
  drawText(`${options.numero_protocolo} - ${dataHora} TRANSPORTES FRAMENTO LTDA`, 9);
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Formata data em extenso (ex: "26 de fevereiro de 2026")
 */
function formatDataExtensa(date: Date): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  
  return `${dia} de ${mes} de ${ano}`;
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  if (cpf.length !== 11) return cpf;
  return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9)}`;
}

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12)}`;
}
