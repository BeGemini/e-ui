// 用正确的SECRET测试token验证
import jwt from 'jsonwebtoken';

const JWT_SECRET = '325c5275b63cd3b30bd0c0d54ad53853536ce3695181cc09774cee50e0ae0a0b';

function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

// Test data
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzNjZTg5Mi1jMWU2LTQ4MGUtYjZlMy1jZGRiM2YxNjhkOTEiLCJlbWFpbCI6ImxlYXJuZXIyQHRlc3QuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3ODg5NjgxNTQsImV4cCI6MTc4OTA1NDU1NH0.7TLIKpA22-wEP3Fd4-gmKY7PdEggkBYq-MuLRCk0Noo';

console.log('🔍 Testing token verification with CORRECT secret...\n');
console.log(`JWT_SECRET: ${JWT_SECRET}`);
console.log(`Token: ${testToken.substring(0, 60)}...\n`);

const verified = verifyJWT(testToken);
if (verified) {
  console.log('✅ Token verification SUCCESS!');
  console.log('Decoded:', JSON.stringify(verified, null, 2));
} else {
  console.log('❌ Token verification FAILED!');
}

// Also try generating a new token with the correct secret
console.log('\n\nGenerating new token with correct secret...');
const newToken = jwt.sign(
  {
    userId: '273ce892-c1e6-480e-b6e3-cddb3f168d91',
    email: 'learner2@test.com',
    role: 'user'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);
console.log('New token:', newToken.substring(0, 60) + '...');

const newVerified = verifyJWT(newToken);
console.log('Verification:', newVerified ? '✅ SUCCESS' : '❌ FAILED');
