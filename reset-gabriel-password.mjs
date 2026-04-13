import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc';

async function resetPassword() {
  try {
    const response = await fetch(`${API_URL}/auth.resetPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          email: 'gabriel.ferreira',
          newPassword: 'senha123'
        }
      })
    });

    const data = await response.json();
    console.log('Reset password response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();
