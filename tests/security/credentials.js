import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export const options = {
  // Simulates a credential stuffing attack (rapid bruteforce)
  scenarios: {
    brute_force: {
      executor: 'constant-vus',
      vus: 50, // 50 concurrent attackers
      duration: '30s',
    },
  },
  thresholds: {
    // We expect 100% of these to fail auth, but we want to ensure rate limiting blocks them (HTTP 429)
    // or that the server doesn't crash (no 5xx errors).
  },
};

export default function () {
  const payload = JSON.stringify({
    email: `admin_${__VU}_${__ITER}@example.com`,
    password: `PwnedPass_${__ITER}!`
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  // Check that the system properly rejected the login attempt
  check(res, {
    'auth failed (401)': (r) => r.status === 401,
    'rate limited (429)': (r) => r.status === 429,
  });

  sleep(0.1); // Rapid requests to trigger rate limit
}
