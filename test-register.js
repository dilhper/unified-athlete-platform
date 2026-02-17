const testRegistration = async () => {
  try {
    console.log('Testing registration endpoint...');
    
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'testpass123',
        role: 'athlete'
      }),
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (!response.ok) {
      console.error('Registration failed:', data);
    } else {
      console.log('Registration successful!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testRegistration();
