import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export const options = {
  // SAFE LOCAL SETTINGS
  // This will NOT crash your laptop or backend. It caps at exactly 50 concurrent users.
  stages: [
    { duration: '30s', target: 20 },  // gently ramp to 20 users
    { duration: '1m', target: 50 },   // ramp to 50 users (safe limit for local PC ports)
    { duration: '1m', target: 50 },   // sustain load
    { duration: '30s', target: 0 },   // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Expect slower responses locally since the DB and App share CPU
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', 'http://localhost:5000/health/json'],
  ]);

  check(responses[0], {
    'Local Backend is 200 OK': (r) => r.status === 200,
  });

  sleep(1); 
}
