import { verifyJWT, generateJWT } from './lib/auth.js';

// Test token from curl
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzNjZTg5Mi1jMWU2LTQ4MGUtYjZlMy1jZGRiM2YxNjhkOTEiLCJlbWFpbCI6ImxlYXJuZXIyQHRlc3QuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3ODk5NjgxNTQsImV4cCI6MTc4OTA1NDU1NH0.7TLIKpA22-wEP3Fd4-gmKY7PdEggkBYq-MuLRCk0Noo';

console.log('Testing JWT verification...');
console.log('Token:', testToken);

const decoded = verifyJWT(testToken);
console.log('Decoded:', decoded);

if (decoded) {
  console.log('✅ Token is valid!');
  console.log('  userId:', decoded.userId);
  console.log('  email:', decoded.email);
  console.log('  role:', decoded.role);
} else {
  console.log('❌ Token verification failed!');
}

// Test generating a new token
console.log('\n\nTesting JWT generation...');
const newToken = generateJWT({
  userId: '273ce892-c1e6-480e-b6e3-cddb3f168d91',
  email: 'learner2@test.com',
  role: 'user'
});
console.log('Generated token:', newToken);

const newDecoded = verifyJWT(newToken);
console.log('Decoded:', newDecoded);

if (newDecoded) {
  console.log('✅ New token is valid!');
}
