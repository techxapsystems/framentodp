/**
 * Framento PDF Generator v4
 * Gera PDF de advertência com template oficial
 */

import { PDFDocument, PDFPage, rgb, degrees } from 'pdf-lib';
import { WarningResult } from './framentoRulesEngineV4';

export interface PDFGeneratorOptions {
  cnpj?: string;
  empresa?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

/**
 * Formata CPF para exibição
 */
function formatarCPF(cpf: string): string {
  if (!cpf || cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/**
 * Formata data para exibição
 */
function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Gera PDF de advertência
 */
export async function gerarPDFAdvertencia(
  warning: WarningResult,
  options: PDFGeneratorOptions = {}
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  // Cores
  const preto = rgb(0, 0, 0);
  const cinza = rgb(0.5, 0.5, 0.5);
  const cinzaClaro = rgb(0.9, 0.9, 0.9);

  // Margens
  const marginTop = 40;
  const marginLeft = 40;
  const marginRight = 40;
  const lineHeight = 14;
  let yPosition = height - marginTop;

  // Função auxiliar para desenhar texto
  function drawText(text: string, size: number = 11, bold: boolean = false, x: number = marginLeft) {
    page.drawText(text, {
      x,
      y: yPosition,
      size,
      color: preto,
      maxWidth: width - marginLeft - marginRight,
    });
    yPosition -= lineHeight;
  }

  // Cabeçalho
  yPosition -= 10;
  drawText('COMUNICADO DE ADVERTÊNCIA', 14, true);
  yPosition -= 10;

  // Protocolo e data
  const dataAtual = new Date();
  const protocoloText = warning.numeroProtocolo ? `Protocolo: ${warning.numeroProtocolo}` : '';
  const dataText = `Data: ${formatarData(dataAtual)}`;

  page.drawText(protocoloText, {
    x: marginLeft,
    y: yPosition,
    size: 10,
    color: cinza,
  });

  page.drawText(dataText, {
    x: width - marginRight - 150,
    y: yPosition,
    size: 10,
    color: cinza,
  });

  yPosition -= 20;

  // Linha divisória
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: width - marginRight, y: yPosition },
    thickness: 1,
    color: cinzaClaro,
  });

  yPosition -= 15;

  // Dados da empresa
  if (options.empresa || options.cnpj) {
    drawText(`Empresa: ${options.empresa || 'Framento'}`, 11, true);
    if (options.cnpj) {
      drawText(`CNPJ: ${options.cnpj}`, 10);
    }
    if (options.endereco) {
      drawText(`Endereço: ${options.endereco}`, 10);
    }
    yPosition -= 5;
  }

  // Dados do motorista
  drawText('DADOS DO MOTORISTA', 11, true);
  yPosition -= 5;

  drawText(`Nome: ${warning.condutor}`, 10);
  drawText(`CPF: ${formatarCPF(warning.cpf)}`, 10);
  if (warning.matricula) {
    drawText(`Matrícula: ${warning.matricula}`, 10);
  }
  if (warning.ctps) {
    drawText(`CTPS: ${warning.ctps}`, 10);
  }

  drawText(`Placa do Veículo: ${warning.placa}`, 10);
  if (warning.operacao) {
    drawText(`Operação: ${warning.operacao}`, 10);
  }

  yPosition -= 10;

  // Dados da infração
  drawText('INFORMAÇÕES DA INFRAÇÃO', 11, true);
  yPosition -= 5;

  drawText(`Data: ${formatarData(warning.data)}`, 10);
  drawText(`Dia da Semana: ${warning.diaSemana}`, 10);

  if (warning.infracos.length > 0) {
    yPosition -= 5;
    drawText('Infrações Detectadas:', 10, true);
    for (const infracao of warning.infracos) {
      yPosition -= 2;
      drawText(`• ${infracao.descricao}`, 9);
      drawText(`  Valor: ${infracao.valor} | Limite: ${infracao.limite}`, 9);
    }
  }

  yPosition -= 15;

  // Texto da advertência
  if (warning.textoAdvertencia) {
    drawText('MOTIVO DA ADVERTÊNCIA', 11, true);
    yPosition -= 5;

    // Quebra texto em linhas
    const maxWidth = width - marginLeft - marginRight - 20;
    const linhas = quebrarTexto(warning.textoAdvertencia, maxWidth, 10);

    for (const linha of linhas) {
      if (yPosition < 100) {
        // Próxima página se necessário
        yPosition = height - marginTop;
        page.drawText(linha, {
          x: marginLeft + 10,
          y: yPosition,
          size: 10,
          color: preto,
        });
      } else {
        page.drawText(linha, {
          x: marginLeft + 10,
          y: yPosition,
          size: 10,
          color: preto,
        });
      }
      yPosition -= lineHeight;
    }
  }

  yPosition -= 20;

  // Status da advertência
  const statusText = `Status: ${warning.status}`;
  const statusColor =
    warning.status === 'ADVERTENCIA'
      ? rgb(1, 0, 0) // Vermelho
      : warning.status === 'EM_REVISAO'
        ? rgb(1, 0.65, 0) // Laranja
        : rgb(0.5, 0.5, 0.5); // Cinza

  page.drawText(statusText, {
    x: marginLeft,
    y: yPosition,
    size: 11,
    color: statusColor,
  });

  yPosition -= 30;

  // Assinaturas
  drawText('ASSINATURAS', 11, true);
  yPosition -= 20;

  // Linha para assinatura da empresa
  page.drawLine({
    start: { x: marginLeft, y: yPosition },
    end: { x: marginLeft + 150, y: yPosition },
    thickness: 1,
    color: preto,
  });

  drawText('Empresa / Responsável', 9);
  drawText('Data: ___/___/_____', 9);

  yPosition -= 30;

  // Linha para assinatura do motorista
  page.drawLine({
    start: { x: marginLeft + 250, y: yPosition + lineHeight },
    end: { x: marginLeft + 250 + 150, y: yPosition + lineHeight },
    thickness: 1,
    color: preto,
  });

  page.drawText('Motorista / Assinado', {
    x: marginLeft + 250,
    y: yPosition,
    size: 9,
    color: preto,
  });

  page.drawText('Data: ___/___/_____', {
    x: marginLeft + 250,
    y: yPosition - lineHeight,
    size: 9,
    color: preto,
  });

  yPosition -= 40;

  // Rodapé
  page.drawText('Este documento é uma cópia do comunicado oficial de advertência.', {
    x: marginLeft,
    y: 20,
    size: 8,
    color: cinza,
  });

  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: width - marginRight - 200,
    y: 20,
    size: 8,
    color: cinza,
  });

  // Converter para buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes as Uint8Array);
}

/**
 * Quebra texto em linhas de acordo com a largura máxima
 */
function quebrarTexto(texto: string, maxWidth: number, fontSize: number): string[] {
  // Estimativa simples: ~60 caracteres por linha em 10pt
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.5));
  const linhas: string[] = [];

  let textoRestante = texto;
  while (textoRestante.length > 0) {
    if (textoRestante.length <= charsPerLine) {
      linhas.push(textoRestante);
      break;
    }

    // Encontra o último espaço antes de charsPerLine
    let breakPoint = charsPerLine;
    for (let i = charsPerLine; i > 0; i--) {
      if (textoRestante[i] === ' ') {
        breakPoint = i;
        break;
      }
    }

    linhas.push(textoRestante.substring(0, breakPoint).trim());
    textoRestante = textoRestante.substring(breakPoint).trim();
  }

  return linhas;
}

/**
 * Gera múltiplos PDFs em um ZIP
 */
export async function gerarZIPComPDFs(
  warnings: WarningResult[],
  options: PDFGeneratorOptions = {}
): Promise<Map<string, Buffer>> {
  const pdfs = new Map<string, Buffer>();

  for (const warning of warnings) {
    // Apenas gerar PDF para ADVERTENCIA (não para EM_REVISAO ou CONFERENCIA_MANUAL)
    if (warning.status === 'ADVERTENCIA') {
      const pdf = await gerarPDFAdvertencia(warning, options);
      const nomeArquivo = `Advertencia_${warning.cpf.replace(/\D/g, '')}_${warning.numeroProtocolo || 'SN'}.pdf`;
      pdfs.set(nomeArquivo, pdf);
    }
  }

  return pdfs;
}
