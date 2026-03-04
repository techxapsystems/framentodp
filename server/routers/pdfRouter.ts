import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { generateWarningPDF } from '../services/pdfService';

export const pdfRouter = router({
  generateWarningPDF: protectedProcedure
    .input(
      z.object({
        type: z.enum(['advertencia', 'suspensao']),
        employeeName: z.string(),
        employeeCPF: z.string(),
        employeeCTPS: z.string(),
        licensePlate: z.string(),
        operation: z.string(),
        infringementDate: z.string(),
        reason: z.string(),
        description: z.string(),
        penaltyType: z.string(),
        penaltyDuration: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        returnDate: z.string(),
        signatureDate: z.string(),
        companyName: z.string().optional(),
        companyAddress: z.string().optional(),
        companyCNPJ: z.string().optional(),
        companyCity: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const pdfBuffer = await generateWarningPDF(input);
        const base64 = pdfBuffer.toString('base64');
        
        return {
          success: true,
          pdf: base64,
          filename: `${input.type}_${input.employeeName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
        };
      } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Falha ao gerar PDF');
      }
    }),

  generateWarningPDFStream: protectedProcedure
    .input(
      z.object({
        type: z.enum(['advertencia', 'suspensao']),
        employeeName: z.string(),
        employeeCPF: z.string(),
        employeeCTPS: z.string(),
        licensePlate: z.string(),
        operation: z.string(),
        infringementDate: z.string(),
        reason: z.string(),
        description: z.string(),
        penaltyType: z.string(),
        penaltyDuration: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        returnDate: z.string(),
        signatureDate: z.string(),
        companyName: z.string().optional(),
        companyAddress: z.string().optional(),
        companyCNPJ: z.string().optional(),
        companyCity: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const pdfBuffer = await generateWarningPDF(input);
        return {
          success: true,
          size: pdfBuffer.length,
          filename: `${input.type}_${input.employeeName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
        };
      } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Falha ao gerar PDF');
      }
    }),
});
