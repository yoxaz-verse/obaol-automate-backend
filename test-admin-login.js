const axios = require('axios');
async function test() {
    try {
        const res = await axios.post('http://localhost:5001/api/v1/web/login', {
            email: "exports@obaol.com",
            password: "12345",
            role: "Admin"
        }, {
            headers: { IDENTIFIER: "A2hG9tE4rB6kY1sN" }
        });
        console.log("Login Status:", res.status);
        console.log("Login Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Login Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}
test();
