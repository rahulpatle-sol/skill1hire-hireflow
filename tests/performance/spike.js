import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export const options = {
  // Spike testing simulates a sudden surge of massive traffic
  // (e.g. a viral marketing campaign or sudden botnet surge)
  stages: [
    { duration: '10s', target: 100 },   // Baseline
    { duration: '1m', target: 10000 },  // Sudden spike to 10k
    { duration: '3m', target: 10000 },  // Maintain spike
    { duration: '1m', target: 100 },    // Sudden drop
    { duration: '10s', target: 0 },     // Recovery
  ],
};

export default function () {
  const payload = JSON.stringify({
    email: `loadtest_${Math.random()}@example.com`,
    password: 'password123'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  // Test authenticating under spike conditions
  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  // We actually expect 401 Unauthorized for fake accounts, but we are testing
  // that the server returns a proper API error rather than crashing/timing out (502/504)
  check(res, {
    'status is not 5xx (Server crashed)': (r) => r.status < 500,
  });

  sleep(1);
}
