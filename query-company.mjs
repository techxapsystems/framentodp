import { db } from './server/db.ts';

const companies = await db.query.companies.findMany();
console.log(JSON.stringify(companies, null, 2));
