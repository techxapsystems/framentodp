import { getDb } from './server/db.ts';

async function checkDrivers() {
  try {
    const db = getDb();
    const drivers = await db.query.drivers.findMany();
    console.log('Total de motoristas:', drivers.length);
    console.log('Motoristas:', JSON.stringify(drivers, null, 2));
  } catch (error) {
    console.error('Erro:', error.message);
  }
  process.exit(0);
}

checkDrivers();
