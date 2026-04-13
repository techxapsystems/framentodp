#!/usr/bin/env node

// Test how superjson serializes data
import superjson from 'superjson';

const input = {
  email: 'gabriel.ferreira',
  password: 'senha123'
};

console.log('Original input:', input);
console.log('');

// Serialize with superjson
const serialized = superjson.stringify(input);
console.log('Superjson serialized:', serialized);
console.log('');

// Deserialize
const deserialized = superjson.parse(serialized);
console.log('Superjson deserialized:', deserialized);
console.log('');

// Test with tRPC format
console.log('Testing tRPC format...');
console.log('');

// The tRPC client should send the input as the request body
// Let's check what the actual format should be
const trpcPayload = {
  json: input
};

console.log('tRPC payload format:', JSON.stringify(trpcPayload));
console.log('');

// Test sending to server
const BASE_URL = 'http://localhost:3000';

async function testWithSuperjson() {
  console.log('Testing with superjson serialization...');
  
  const response = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      json: {
        email: 'gabriel.ferreira',
        password: 'senha123'
      }
    })
  });

  console.log('Status:', response.status);
  const body = await response.text();
  console.log('Response:', body.substring(0, 300));
}

testWithSuperjson().catch(console.error);
