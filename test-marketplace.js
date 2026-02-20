const axios = require('axios');

async function test() {
  try {
    // 1. Login as Associate to get token
    const loginRes = await axios.post('http://localhost:3000/api/v1/web/auth/login', {
      email: 'nongduhivcsltd@gmail.com', // Let's guess an associate email or create one?
      password: 'testpassword' // Wait, I don't know an associate's credentials!
    });
    console.log(loginRes.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
