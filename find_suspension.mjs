import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute('SELECT id, conductorName, warningType, dataInicio, dataFim, dataRetorno FROM warnings WHERE warningType = ? LIMIT 1', ['suspensao']);
console.log(JSON.stringify(rows[0], null, 2));
connection.end();
