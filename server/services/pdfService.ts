import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export interface WarningPDFData {
  type: 'advertencia' | 'suspensao';
  employeeName: string;
  employeeCPF: string;
  employeeCTPS: string;
  licensePlate: string;
  operation: string;
  infringementDate: string;
  reason: string;
  description: string;
  penaltyType: string;
  penaltyDuration: string;
  startDate: string;
  endDate: string;
  returnDate: string;
  companyName?: string;
  companyAddress?: string;
  companyCNPJ?: string;
  companyCity?: string;
  signatureDate: string;
}

export async function generateWarningPDF(data: WarningPDFData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const fontSize = 11;
  const smallFontSize = 9;
  const titleFontSize = 16;
  const margin = 40;
  const lineHeight = 14;

  let yPosition = height - margin;

  // Helper function to draw text
  const drawText = (text: string, x: number, y: number, size: number = fontSize, bold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  };

  // Title
  const titleText = data.type === 'suspensao' ? 'Suspensão Disciplinar' : 'Advertência Disciplinar';
  const titleWidth = titleText.length * 6; // Approximate width
  drawText(titleText, width / 2 - titleWidth / 2, yPosition, titleFontSize, true);
  yPosition -= lineHeight * 2;

  // Company Information
  drawText('Empresa:', margin, yPosition);
  yPosition -= lineHeight;
  drawText(data.companyName || 'TRANSPORTES FRAMENTO LTDA', margin + 20, yPosition);
  yPosition -= lineHeight;
  drawText(data.companyAddress || 'R Borges De Medeiros, 897', margin + 20, yPosition);
  yPosition -= lineHeight;
  drawText('89.801-161 - ' + (data.companyCity || 'CHAPECÓ') + ' SC', margin + 20, yPosition);
  yPosition -= lineHeight;
  drawText('CNPJ: ' + (data.companyCNPJ || '00.766.315/0001-44'), margin, yPosition);
  yPosition -= lineHeight * 1.5;

  // Employee Information
  drawText('Empregado: ' + data.employeeName, margin, yPosition);
  yPosition -= lineHeight;
  drawText('CPF: ' + data.employeeCPF, margin, yPosition);
  yPosition -= lineHeight;
  drawText('CTPS: ' + data.employeeCTPS, margin, yPosition);
  yPosition -= lineHeight;
  drawText('Placa: ' + data.licensePlate + ' | Operação: ' + data.operation, margin, yPosition);
  yPosition -= lineHeight * 2;

  // Main text
  const mainText = `Tem esta a finalidade de aplicar-lhe a pena de ${data.type === 'suspensao' ? 'suspensão' : 'advertência'} disciplinar, em razão da(s) seguinte(s) ocorrência(a):

${data.description}

A conduta caracteriza falta grave, nos termos do art. 482 da CLT, especialmente nas alíneas:
b) mau procedimento;
f) embriaguez em serviço;
h) ato de indisciplina ou insubordinação.

Diante da gravidade dos fatos, fica aplicada a penalidade de:
${data.penaltyType}
Início: ${data.startDate}
Término: ${data.endDate}
Retorno ao trabalho: ${data.returnDate}

A ${data.type === 'suspensao' ? 'suspensão' : 'advertência'} será aplicada sem remuneração dos dias correspondentes. Solicita-se a assinatura do colaborador para ciência. Em caso de recusa, o documento poderá ser assinado por representante da empresa e duas testemunhas.`;

  // Draw main text with word wrap
  const words = mainText.split(' ');
  let currentLine = '';
  const maxWidth = width - 2 * margin;

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const textWidth = testLine.length * 5.5; // Approximate character width

    if (textWidth > maxWidth && currentLine) {
      drawText(currentLine, margin, yPosition, fontSize);
      yPosition -= lineHeight;
      currentLine = word;
    } else {
      currentLine = testLine;
    }

    if (yPosition < margin + 100) {
      break; // Prevent overflow
    }
  }

  if (currentLine) {
    drawText(currentLine, margin, yPosition, fontSize);
    yPosition -= lineHeight * 3;
  }

  // Signature lines
  drawText('_________________________________', margin, yPosition);
  yPosition -= lineHeight;
  drawText('TRANSPORTES FRAMENTO LTDA', margin, yPosition);
  yPosition -= lineHeight * 2;

  drawText('_________________________________', width / 2, yPosition);
  yPosition -= lineHeight;
  drawText(data.employeeName, width / 2, yPosition);
  yPosition -= lineHeight * 2;

  // Footer
  drawText(`Favor dar ciente na cópia desta.`, margin, yPosition);
  yPosition -= lineHeight;
  drawText(`${data.companyCity || 'CHAPECÓ'}, ${data.signatureDate}.`, margin, yPosition);

  // Document reference
  yPosition = margin - 10;
  drawText('TRANSPORTES FRAMENTO LTDA', margin, yPosition, smallFontSize);
  drawText(new Date().toLocaleDateString('pt-BR'), width - margin - 50, yPosition, smallFontSize);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
