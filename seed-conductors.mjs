import { getDb } from './server/db.ts';
import { conductors } from './drizzle/schema.ts';

async function seedConductors() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database not available');
      process.exit(1);
    }

    // Motoristas de teste
    const testConductors = [
      {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        operacao: 'Operação A',
        cargo: 'Motorista de Truck',
        placa: 'ABC-1234',
        status: 'ativo',
      },
      {
        nome: 'Maria Santos',
        cpf: '987.654.321-00',
        operacao: 'Operação B',
        cargo: 'Motorista de Carreta',
        placa: 'XYZ-5678',
        status: 'ativo',
      },
      {
        nome: 'Pedro Oliveira',
        cpf: '456.789.123-00',
        operacao: 'Operação A',
        cargo: 'Motorista de Truck',
        placa: 'DEF-9012',
        status: 'ativo',
      },
      {
        nome: 'Ana Costa',
        cpf: '789.123.456-00',
        operacao: 'Operação C',
        cargo: 'Motorista de Carreta',
        placa: 'GHI-3456',
        status: 'ativo',
      },
      {
        nome: 'Carlos Ferreira',
        cpf: '321.654.987-00',
        operacao: 'Operação B',
        cargo: 'Motorista de Truck',
        placa: 'JKL-7890',
        status: 'ativo',
      },
    ];

    // Inserir motoristas
    for (const conductor of testConductors) {
      try {
        await db.insert(conductors).values(conductor);
        console.log(`✓ Motorista criado: ${conductor.nome}`);
      } catch (error) {
        if (error.message.includes('Duplicate entry')) {
          console.log(`⚠ Motorista já existe: ${conductor.nome}`);
        } else {
          console.error(`✗ Erro ao criar motorista ${conductor.nome}:`, error.message);
        }
      }
    }

    // Verificar quantos motoristas foram criados
    const allConductors = await db.select().from(conductors);
    console.log(`\n✓ Total de motoristas no banco: ${allConductors.length}`);
    console.log('Motoristas:', allConductors.map(c => ({ nome: c.nome, placa: c.placa, operacao: c.operacao })));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

seedConductors();
