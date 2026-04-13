#!/usr/bin/env node

// Test different ways to send tRPC requests
const BASE_URL = 'http://localhost:3000';

async function testFormats() {
  console.log('Testing different tRPC request formats...\n');

  try {
    // Format 1: JSON in body (standard)
    console.log('Format 1: JSON in body');
    const res1 = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gabriel.ferreira',
        password: 'senha123'
      })
    });
    console.log('Status:', res1.status);
    const body1 = await res1.text();
    console.log('Has error:', body1.includes('"error"'));
    console.log('');

    // Format 2: With superjson encoding (what tRPC client might use)
    console.log('Format 2: With superjson wrapper');
    const res2 = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          email: 'gabriel.ferreira',
          password: 'senha123'
        }
      })
    });
    console.log('Status:', res2.status);
    const body2 = await res2.text();
    console.log('Has error:', body2.includes('"error"'));
    console.log('Body:', body2.substring(0, 200));
    console.log('');

    // Format 3: Check what the actual tRPC client sends
    console.log('Format 3: Checking actual tRPC client format...');
    // The tRPC client should send the input directly as the request body
    // Let's try with a simpler approach
    const res3 = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gabriel.ferreira',
        password: 'senha123'
      })
    });
    console.log('Status:', res3.status);
    const body3 = await res3.json();
    if (body3.result) {
      console.log('SUCCESS! Result:', body3.result);
    } else if (body3.error) {
      console.log('ERROR:', body3.error.json.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFormats();
