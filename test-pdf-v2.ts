import { generateWarningPDF } from "./server/services/pdfService";
import fs from "fs";

async function main() {
  const pdfBuffer = await generateWarningPDF({
    type: "suspensao",
    employeeName: "DOUGLAS LUIS CALIXTO ARAUJO DA SILVA",
    employeeCPF: "140.382.477-08",
    employeeCTPS: "001013879    5626 - MG",
    licensePlate: "ABC-1234",
    operation: "Transporte",
    infringementDate: "27/04/2026",
    reason: "Faltas injustificadas",
    description: "A Transportes Framento, decide aplicar a penalidade disciplinar de suspensão por 3 (três) dias, sem direito à remuneração e ao repouso semanal remunerado (DSR), no período de 30/04/2026 a 02/05/2026 devendo retornar às suas atividades normalmente no dia 03/05/2026, em razão de faltas injustificadas, configurando insubordinação e desídia no desempenho de suas funções.\n\nColaborador: Douglas Luis Calixto Araujo da Silva\nCPF: 140.382.477-08\n\nConsiderando que o colaborador deixou de comparecer ao trabalho nos dias 27 e 28 de abril de 2026, sem apresentar qualquer justificativa válida à empresa, bem como não realizou contato em momento algum para informar sua ausência;\n\nConsiderando que se trata de reincidência, tendo o colaborador já sido anteriormente advertido formalmente por faltas injustificadas;\n\nConsiderando o princípio da imediatidade na aplicação da medida disciplinar;\n\nA empresa delibera pela aplicação da suspensão disciplinar pelo período acima mencionado.\n\nDurante o período de suspensão, o colaborador permanecerá afastado de suas atividades, sem percepção de salário ou quaisquer benefícios correspondentes.\n\nReiteramos a importância do cumprimento das normas internas, bem como das responsabilidades inerentes ao cargo, a fim de garantir o bom funcionamento, a disciplina e a harmonia no ambiente de trabalho.\n\nSolicitamos que o colaborador assine o presente documento para ciência. Em caso de recusa, o documento será assinado por duas testemunhas, a fim de comprovar a devida comunicação da penalidade.",
    penaltyType: "Suspensão",
    penaltyDuration: "3 dias",
    startDate: "2026-04-30T00:00:00.000Z",
    endDate: "2026-05-02T00:00:00.000Z",
    returnDate: "2026-05-03T00:00:00.000Z",
    companyName: "TRANSPORTES FRAMENTO LTDA",
    companyAddress: "Ed. Vértice Office - R. Borges de Medeiros, 897 - E - sala 1201",
    companyCNPJ: "00.766.315/0009-00",
    companyCity: "Chapecó",
    signatureDate: "29 de abril de 2026",
  });

  fs.writeFileSync("/home/ubuntu/Downloads/suspension-test-v2.pdf", pdfBuffer);
  console.log("PDF generated: /home/ubuntu/Downloads/suspension-test-v2.pdf");
  console.log("Size:", pdfBuffer.length, "bytes");
}

main().catch(console.error);
