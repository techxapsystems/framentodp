import { generateWarningPDF } from './server/services/pdfService';
import fs from 'fs';

const testData = {
  type: 'suspensao' as const,
  employeeName: 'DOUGLAS LUIS CALIXTO ARAUJO DA SILVA',
  employeeCPF: '140.382.477-08',
  employeeCTPS: '123456    1234 - 5',
  licensePlate: 'MKL7451',
  operation: 'BRF RJ',
  infringementDate: '27/04/2026',
  reason: 'Falta injustificada',
  description: 'A Transportes Framento, com fundamento no artigo 482, alíneas "e" e "h", da Consolidação das Leis do Trabalho (CLT), decide aplicar a penalidade disciplinar de suspensão por 3 (três) dias, sem direito à remuneração e ao repouso semanal remunerado (DSR), no período de 30/04/2026 a 02/05/2026 devendo retornar às suas atividades normalmente no dia 03/05/2026, em razão de faltas injustificadas, configurando insubordinação e desídia no desempenho de suas funções.',
  penaltyType: 'Suspensão',
  penaltyDuration: '3 dias',
  startDate: '30/04/2026',
  endDate: '02/05/2026',
  returnDate: '03/05/2026',
  companyName: 'TRANSPORTES FRAMENTO LTDA',
  companyAddress: 'Contorno da Petrobras, 107',
  companyCNPJ: '00.766.315/0009-00',
  companyCity: 'CHAPECÓ',
  signatureDate: '29 de abril de 2026',
};

generateWarningPDF(testData)
  .then(buffer => {
    fs.writeFileSync('/home/ubuntu/Downloads/suspension-test.pdf', buffer);
    console.log('✅ PDF gerado com sucesso!');
    console.log('Tamanho:', buffer.length, 'bytes');
    console.log('Arquivo: /home/ubuntu/Downloads/suspension-test.pdf');
  })
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
