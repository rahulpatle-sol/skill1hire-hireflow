import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
  // 1. SQL Injection Payload testing on Public Endpoints
  const sqliPayload = "' OR 1=1 --";
  let resSqli = http.get(`${BASE_URL}/candidate/public/${sqliPayload}`);
  
  check(resSqli, {
    'SQLi properly escaped/rejected': (r) => r.status === 404 || r.status >= 400,
    'SQLi did not crash db': (r) => r.status !== 500,
  });

  // 2. Unauthenticated access check to private endpoint
  let resPrivate = http.get(`${BASE_URL}/candidate/profile`);
  
  check(resPrivate, {
    'Blocked unauthenticated access': (r) => r.status === 401,
  });

  // 3. XSS Payload testing
  const xssPayload = JSON.stringify({ name: "<script>alert('XSS')</script>" });
  
  let resXss = http.post(`${BASE_URL}/auth/register`, xssPayload, {
    headers: { 'Content-Type': 'application/json' }
  });

  check(resXss, {
    'XSS caught/safely handled': (r) => r.status >= 400 && r.status < 500,
  });
}
