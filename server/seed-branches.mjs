import { db } from "./db.js";
import { branches } from "../drizzle/schema.js";

async function seedBranches() {
  try {
    // Check if branches already exist
    const existing = await db.select().from(branches).limit(1);
    
    if (existing.length > 0) {
      console.log("✅ Branches already seeded");
      process.exit(0);
    }

    // Insert default branches for Chapecó
    await db.insert(branches).values([
      {
        nome: "FILIAL CHAPECÓ",
        operacaoNome: "BRF EMBU",
        cnpj: "00.766.315/0001-44",
        endereco: "R Borges De Medeiros, 897",
        cidade: "CHAPECO",
        uf: "SC",
        cep: "89.801-161",
        ativo: true,
      },
      {
        nome: "FILIAL CHAPECÓ",
        operacaoNome: "BRF LONDRINA",
        cnpj: "00.766.315/0001-44",
        endereco: "R Borges De Medeiros, 897",
        cidade: "CHAPECO",
        uf: "SC",
        cep: "89.801-161",
        ativo: true,
      },
      {
        nome: "FILIAL CHAPECÓ",
        operacaoNome: "MINERVA",
        cnpj: "00.766.315/0001-44",
        endereco: "R Borges De Medeiros, 897",
        cidade: "CHAPECO",
        uf: "SC",
        cep: "89.801-161",
        ativo: true,
      },
    ]);

    console.log("✅ Branches seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding branches:", error);
    process.exit(1);
  }
}

seedBranches();
