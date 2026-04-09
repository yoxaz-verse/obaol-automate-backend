const autocannon = require("autocannon");

const baseUrl = process.env.LOAD_BASE_URL || "http://localhost:5001";
const email = process.env.LOAD_EMAIL || "loadtest@example.com";
const password = process.env.LOAD_PASSWORD || "Passw0rd!";
const role = process.env.LOAD_ROLE || "Associate";

const loginPath = "/api/v1/web/login";
const verifyPath = "/api/v1/web/verify-token";

const login = async () => {
  const res = await fetch(`${baseUrl}${loginPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }

  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/auth_token=([^;]+)/);
  if (!match) {
    throw new Error("Login succeeded but auth_token cookie was not set.");
  }
  return match[1];
};

const runPhase = (name, options) =>
  new Promise((resolve, reject) => {
    const instance = autocannon(options, (err, result) => {
      if (err) return reject(err);
      console.log(`\n${name} complete`);
      console.log(`Requests: ${result.requests.total}`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Latency (p50/p90/p99): ${result.latency.p50} / ${result.latency.p90} / ${result.latency.p99} ms`);
      resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });

const main = async () => {
  console.log("Starting auth load smoke test...");
  console.log(`Target: ${baseUrl}`);
  console.log(`User: ${email} (${role})`);

  const token = await login();

  const headers = {
    Cookie: `auth_token=${token}`,
  };

  await runPhase("Warmup", {
    url: `${baseUrl}${verifyPath}`,
    method: "GET",
    headers,
    connections: 5,
    duration: 8,
  });

  await runPhase("Steady", {
    url: `${baseUrl}${verifyPath}`,
    method: "GET",
    headers,
    connections: 15,
    duration: 15,
  });

  console.log("Auth load smoke test finished.");
};

main().catch((err) => {
  console.error("Load test failed:", err.message || err);
  process.exit(1);
});
