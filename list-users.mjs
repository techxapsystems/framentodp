#!/usr/bin/env node

// List all users from the database
import { getDb } from './server/db.js';

async function listUsers() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database not available');
      process.exit(1);
    }

    // Import the users table from schema
    const { users } = await import('./drizzle/schema.ts');
    
    // Query all users
    const allUsers = await db.select().from(users);
    
    console.log('Users in database:');
    console.log('==================');
    allUsers.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Status: ${user.status}`);
      console.log(`Has password: ${!!user.password}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

listUsers();
