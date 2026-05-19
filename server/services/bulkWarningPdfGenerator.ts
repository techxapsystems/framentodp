import PDFDocument from "pdfkit";
import { AnaliseMotorista } from "./infractionEngine";
import { storagePut } from "../storage";

/**
 * Gera PDF de advertência para um motorista
 */
export async function gerarPdfAdvertencia(
  analise: AnaliseMotorista,
  geradoPor: string,
  branchInfo: { nome: string; cnpj: string; endereco: string; cidade: string; uf: string }
): Promise<{ url: string; key: string; fileSize: number }> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", async () => {
        const buffer = Buffer.concat(chunks);

        // Upload para S3
        const fileKey = `advertencias/importacao/${Date.now()}-${analise.cpf.replace(/\D/g, "")}.pdf`;
        const { url, key } = await storagePut(fileKey, buffer, "application/pdf");

        resolve({
          url,
          key,
          fileSize: buffer.length,
        });
      });

      doc.on("error", reject);

      // Header com logo e dados da empresa
      doc.fontSize(10).text(branchInfo.nome, { align: "center" });
      doc.fontSize(9).text(branchInfo.cnpj, { align: "center" });
      doc.fontSize(9).text(`${branchInfo.endereco}, ${branchInfo.cidade} - ${branchInfo.uf}`, {
        align: "center",
      });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Título
      doc.fontSize(14).font("Helvetica-Bold").text("TERMO DE ADVERTÊNCIA", {
        align: "center",
      });
      doc.moveDown(0.5);

      // Dados do motorista
      doc.fontSize(10).font("Helvetica-Bold").text("DADOS DO COLABORADOR:", {
        underline: true,
      });
      doc.fontSize(10).font("Helvetica");
      doc.text(`Nome: ${analise.nome}`);
      doc.text(`CPF: ${analise.cpf}`);
      doc.text(`Operação: ${analise.operacao}`);
      doc.text(`Placa do Veículo: ${analise.placa}`);
      doc.text(`Ocorrências Registradas: ${analise.totalOcorrencias}`);

      doc.moveDown(0.5);

      // Motivo
      doc.fontSize(10).font("Helvetica-Bold").text("MOTIVO DA ADVERTÊNCIA:", {
        underline: true,
      });
      doc.fontSize(10).font("Helvetica").text(analise.textoAdvertencia, {
        align: "left",
        width: 450,
      });

      doc.moveDown(0.5);

      // Artigos
      if (analise.artigos.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").text("ARTIGOS INFRINGIDOS:", {
          underline: true,
        });
        doc.fontSize(10).font("Helvetica");
        analise.artigos.forEach((artigo) => {
          doc.text(`• ${artigo}`, { width: 450 });
        });
      }

      doc.moveDown(1);

      // Nível de advertência
      doc.fontSize(10).font("Helvetica-Bold").text("NÍVEL DE ADVERTÊNCIA:", {
        underline: true,
      });
      doc.fontSize(10).font("Helvetica");

      const nivelTexto = {
        0: "Sem infração",
        1: "Aviso (1º Nível)",
        2: "Advertência (2º Nível)",
        3: "Suspensão (3º Nível)",
      };

      doc.text(nivelTexto[analise.nivelAdvertencia as keyof typeof nivelTexto] || "Desconhecido");

      doc.moveDown(1);

      // Observações
      doc.fontSize(10).font("Helvetica-Bold").text("OBSERVAÇÕES:", {
        underline: true,
      });
      doc.fontSize(10).font("Helvetica").text(
        "Esta advertência é emitida conforme as disposições da Consolidação das Leis do Trabalho (CLT) e das normas de segurança e conformidade regulatória da empresa. O colaborador foi devidamente notificado e tem direito a defesa.",
        {
          width: 450,
          align: "justify",
        }
      );

      doc.moveDown(1.5);

      // Assinatura
      doc.fontSize(10).font("Helvetica-Bold").text("ASSINATURA DO COLABORADOR:", {
        underline: true,
      });
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
      doc.fontSize(9).text("Assinatura", { align: "center", width: 200 });

      doc.moveDown(1);

      doc.fontSize(10).font("Helvetica-Bold").text("ASSINATURA DO GESTOR:", {
        underline: true,
      });
      doc.moveDown(2);
      doc.moveTo(300, doc.y).lineTo(500, doc.y).stroke();
      doc.fontSize(9).text("Assinatura", { align: "center", width: 200 });

      // Footer
      doc.moveDown(1);
      doc.fontSize(8).text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, {
        align: "center",
      });
      doc.fontSize(8).text(`Gerado por: ${geradoPor}`, {
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera múltiplos PDFs em paralelo
 */
export async function gerarMultiplosPdfs(
  analises: AnaliseMotorista[],
  geradoPor: string,
  branchInfo: { nome: string; cnpj: string; endereco: string; cidade: string; uf: string }
): Promise<{ analise: AnaliseMotorista; pdf: { url: string; key: string; fileSize: number } }[]> {
  const resultados = await Promise.all(
    analises.map(async (analise) => {
      try {
        const pdf = await gerarPdfAdvertencia(analise, geradoPor, branchInfo);
        return { analise, pdf };
      } catch (error) {
        console.error(`Erro ao gerar PDF para ${analise.nome}:`, error);
        throw error;
      }
    })
  );

  return resultados;
}
