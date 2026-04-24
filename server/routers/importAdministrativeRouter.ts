import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { administrativeEmployees, InsertAdministrativeEmployee } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const AdministrativeEmployeeSchema = z.object({
  cadastro: z.string(),
  tipo: z.string(),
  nome: z.string(),
  admissao: z.string(),
  cargo: z.string(),
  situacao: z.string(),
  cpf: z.string(),
});

export const importAdministrativeRouter = router({
  importEmployees: publicProcedure
    .input(
      z.object({
        employees: z.array(AdministrativeEmployeeSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        let imported = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const employee of input.employees) {
          try {
            // Verificar se já existe
            const existing = await db
              .select()
              .from(administrativeEmployees)
              .where(eq(administrativeEmployees.cpf, employee.cpf))
              .limit(1);

            if (existing) {
              // Atualizar
              await db
                .update(administrativeEmployees)
                .set({
                  nome: employee.nome,
                  cargo: employee.cargo,
                  admissao: employee.admissao,
                  situacao: employee.situacao,
                  updatedAt: new Date(),
                })
                .where(eq(administrativeEmployees.cpf, employee.cpf));
            } else {
              // Inserir novo
              await db.insert(administrativeEmployees).values({
                cadastro: employee.cadastro,
                tipo: employee.tipo,
                nome: employee.nome,
                admissao: employee.admissao,
                cargo: employee.cargo,
                situacao: employee.situacao,
                cpf: employee.cpf,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
            imported++;
          } catch (err) {
            failed++;
            errors.push(`Erro ao importar ${employee.nome}: ${String(err)}`);
          }
        }

        return {
          imported,
          failed,
          total: input.employees.length,
          errors: errors.slice(0, 10), // Retornar apenas primeiros 10 erros
        };
      } catch (error) {
        throw new Error(`Erro ao importar funcionários: ${String(error)}`);
      }
    }),

  getAdministrativeEmployees: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const employees = await db.select().from(administrativeEmployees);
    return employees;
  }),

  deleteAdministrativeEmployee: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      await db
        .delete(administrativeEmployees)
        .where(eq(administrativeEmployees.id, input.id));
      return { success: true };
    }),

  getEmployees: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const employees = await db.select().from(administrativeEmployees);
    return employees;
  }),
});
