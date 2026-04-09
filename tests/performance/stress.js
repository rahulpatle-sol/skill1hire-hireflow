import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Stress testing pushes limits until the system breaks
  stages: [
    { duration: '2m', target: 2000 }, // below normal
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 5000 }, // normal
    { duration: '5m', target: 5000 },
    { duration: '2m', target: 15000 },// breakpoint
    { duration: '5m', target: 15000 },
    { duration: '2m', target: 30000 },// complete exhaustion limit
    { duration: '5m', target: 30000 },
    { duration: '10m', target: 0 },   // recovery
  ],
};

export default function () {
  // Heavy hitting endpoint
  http.get('http://localhost:5000/health/json');
  sleep(1);
}
