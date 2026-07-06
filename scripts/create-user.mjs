#!/usr/bin/env node

import fetch from 'node-fetch';
import { createHash } from 'crypto';

const args = process.argv.slice(2);
const email = args[args.indexOf('--email') + 1] || 'carla.massing';
const name = args[args.indexOf('--name') + 1] || 'Carla Massing';
const password = args[args.indexOf('--password') + 1] || 'Carla@2026';
const role = args[args.indexOf('--role') + 1] || 'gestor';
const modules = args[args.indexOf('--modules') + 1]?.split(',') || ['controle_de_advertencias'];

console.log(`Creating user: ${email}`);
console.log(`Name: ${name}`);
console.log(`Role: ${role}`);
console.log(`Modules: ${modules.join(', ')}`);

// For now, just show the command to run
console.log('\n✅ User creation script ready');
console.log('Use the admin panel or tRPC mutation to create the user');
