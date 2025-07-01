import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100000, // 1000 virtual users
  duration: '30s', // test duration
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:5000/api/users/sessions', params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1); 
}