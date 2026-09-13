const autocannon = require("autocannon");

const baseUrl = process.env.LOAD_BASE_URL || "http://localhost:5001";
const email = process.env.LOAD_EMAIL || "loadtest@example.com";
const password = process.env.LOAD_PASSWORD || "Passw0rd!";
const role = process.env.LOAD_ROLE || "Associate";
const p95TargetMs = Number(process.env.LOAD_P95_TARGET_MS || 500);
const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE || 0.01);

const loginPath = "/api/v1/web/login";
const endpoints = (process.env.LOAD_ENDPOINTS || [
  "/api/v1/web/verify-token",
  "/api/v1/web/notifications/unread-summary",
  "/api/v1/web/notifications?page=1&limit=20",
  "/api/v1/web/inquiries?page=1&limit=20",
  "/api/v1/web/orders?page=1&limit=20",
  "/api/v1/web/inventory?page=1&limit=20",
  "/api/v1/web/trade-directory/commodities",
].join(","))
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

const phases = [
  { name: "Warmup 50 connections", connections: Number(process.env.LOAD_WARMUP_CONNECTIONS || 50), duration: Number(process.env.LOAD_WARMUP_DURATION || 20) },
  { name: "Steady 100 connections", connections: Number(process.env.LOAD_STEADY_CONNECTIONS || 100), duration: Number(process.env.LOAD_STEADY_DURATION || 45) },
];

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

const runPhase = (phase, headers) =>
  new Promise((resolve, reject) => {
    const requests = endpoints.map((path) => ({
      method: "GET",
      path,
      headers,
    }));

    const instance = autocannon(
      {
        url: baseUrl,
        connections: phase.connections,
        duration: phase.duration,
        requests,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });

const summarize = (phase, result) => {
  const total = Number(result.requests.total || 0);
  const errors = Number(result.errors || 0) + Number(result.timeouts || 0) + Number(result.non2xx || 0);
  const errorRate = total > 0 ? errors / total : 1;
  const p95 = Number(result.latency.p95 || 0);
  const passed = errorRate <= maxErrorRate && p95 <= p95TargetMs;

  console.log(`\n${phase.name}`);
  console.log(`  Connections: ${phase.connections}`);
  console.log(`  Duration: ${phase.duration}s`);
  console.log(`  Requests/sec avg: ${result.requests.average}`);
  console.log(`  Total requests: ${total}`);
  console.log(`  Non-2xx/errors/timeouts: ${result.non2xx || 0}/${result.errors || 0}/${result.timeouts || 0}`);
  console.log(`  Error rate: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`  Latency p50/p95/p99: ${result.latency.p50}/${result.latency.p95}/${result.latency.p99} ms`);
  console.log(`  Throughput avg: ${Math.round(Number(result.throughput.average || 0) / 1024)} KiB/s`);
  console.log(`  Verdict: ${passed ? "PASS" : "FAIL"}`);

  return {
    phase: phase.name,
    passed,
    total,
    errors,
    errorRate,
    p50: result.latency.p50,
    p95,
    p99: result.latency.p99,
    requestsPerSecond: result.requests.average,
  };
};

const main = async () => {
  console.log("Starting dashboard load test...");
  console.log(`Target: ${baseUrl}`);
  console.log(`User: ${email} (${role})`);
  console.log(`Endpoints: ${endpoints.join(", ")}`);
  console.log(`Acceptance: p95 <= ${p95TargetMs} ms, error rate <= ${(maxErrorRate * 100).toFixed(2)}%`);

  const token = await login();
  const headers = {
    Cookie: `auth_token=${token}`,
    Accept: "application/json",
  };

  const summaries = [];
  for (const phase of phases) {
    const result = await runPhase(phase, headers);
    summaries.push(summarize(phase, result));
  }

  const failed = summaries.filter((summary) => !summary.passed);
  if (failed.length) {
    console.error("\nLoad test failed acceptance criteria:");
    failed.forEach((summary) => {
      console.error(`- ${summary.phase}: p95=${summary.p95}ms errorRate=${(summary.errorRate * 100).toFixed(2)}%`);
    });
    process.exit(1);
  }

  console.log("\nDashboard load test passed.");
};

main().catch((err) => {
  console.error("Load test failed:", err.message || err);
  process.exit(1);
});
