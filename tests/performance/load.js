import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export const options = {
  // To scale to 1 Million users, adjust these parameters on a distributed grid (e.g. k6 Cloud)
  // Running 1M VUs on a single machine is physically impossible due to port/memory exhaustion.
  stages: [
    { duration: '3m', target: 1000 },  // Ramp up to 1k users over 3 min
    { duration: '5m', target: 5000 },  // Ramp up to 5k users over 5 min
    { duration: '5m', target: 10000 }, // Ramp up to 10k users over 5 min (Modify this to 100k or 1M for enterprise distributed testing)
    { duration: '10m', target: 10000 },// Stay at 10k for 10 min
    { duration: '3m', target: 0 },     // Ramp down down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  // Test the primary public endpoints (Health, Public Stats)
  const responses = http.batch([
    ['GET', 'http://localhost:5000/health/json'],
    ['GET', `http://localhost:3000/`], // Frontend SSR test
  ]);

  check(responses[0], {
    'backend API is 200': (r) => r.status === 200,
  });

  check(responses[1], {
    'frontend is 200': (r) => r.status === 200,
  });

  sleep(1); // Think time
}
