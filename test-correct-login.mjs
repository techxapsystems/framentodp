#!/usr/bin/env node

// Test login with the correct format
const BASE_URL = 'http://localhost:3000';

async function testLogin() {
  console.log('Testing login with superjson format...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          email: 'gabriel.ferreira',
          password: 'senha123'
        }
      })
    });

    console.log('Status:', response.status);
    console.log('Set-Cookie:', response.headers.get('set-cookie'));
    
    const body = await response.text();
    console.log('Body:', body.substring(0, 500));

    if (response.status === 200) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      const json = JSON.parse(body);
      console.log('User:', json.result.user);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
