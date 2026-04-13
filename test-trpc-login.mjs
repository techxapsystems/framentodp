#!/usr/bin/env node

// Test the tRPC login endpoint directly using built-in fetch
const BASE_URL = 'http://localhost:3000';

async function testLogin() {
  console.log('Testing tRPC login endpoint...\n');

  try {
    // Test 1: Simple JSON POST
    console.log('Test 1: POST with JSON body');
    const response1 = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gabriel.ferreira',
        password: 'senha123'
      })
    });

    console.log('Status:', response1.status);
    console.log('Headers:', {
      'content-type': response1.headers.get('content-type'),
      'set-cookie': response1.headers.get('set-cookie'),
    });

    const text1 = await response1.text();
    console.log('Body:', text1.substring(0, 800));
    console.log('\n---\n');

    // Test 2: Try with query string
    console.log('Test 2: GET with query string');
    const params = new URLSearchParams({
      input: JSON.stringify({
        email: 'gabriel.ferreira',
        password: 'senha123'
      })
    });

    const response2 = await fetch(`${BASE_URL}/api/trpc/auth.login?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Status:', response2.status);
    const text2 = await response2.text();
    console.log('Body:', text2.substring(0, 800));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
