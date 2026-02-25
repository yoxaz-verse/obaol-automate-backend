const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5001/api/v1/web/login', {
      email: "mmcsmushroom@gmail.com",
      password: "12345",
      role: "Admin"
    }, {
      headers: { IDENTIFIER: "A2hG9tE4rB6kY1sN" }
    });
    console.log("Admin Login Success!");

    // Get cookies
    const cookies = res.headers['set-cookie'];
    const authTokenCookie = cookies.find(c => c.startsWith('auth_token='));
    const token = authTokenCookie ? authTokenCookie.split(';')[0].split('=')[1] : null;

    const user = res.data.user;

    // Now fetch profile
    const profileRes = await axios.get(`http://localhost:5001/api/v1/web/admins/${user.id}`, {
      headers: {
        Cookie: authTokenCookie ? authTokenCookie.split(';')[0] : '',
        IDENTIFIER: "A2hG9tE4rB6kY1sN"
      }
    });
    console.log("Admin Profile Data:", JSON.stringify(profileRes.data, null, 2));

  } catch (e) {
    console.error("Fetch Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}
test();
