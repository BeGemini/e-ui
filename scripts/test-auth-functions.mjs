// 直接测试token提取和验证
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}

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
const authHeader = `Bearer ${testToken}`;

console.log('🔍 Testing token extraction and verification...\n');

// Test 1: Extract token
const extracted = extractTokenFromHeader(authHeader);
console.log('1️⃣ Token extraction:');
console.log(`   Input: ${authHeader.substring(0, 60)}...`);
console.log(`   Extracted: ${extracted ? extracted.substring(0, 60) + '...' : 'null'}`);
console.log(`   Result: ${extracted ? '✅ SUCCESS' : '❌ FAILED'}\n`);

// Test 2: Verify token
if (extracted) {
  const verified = verifyJWT(extracted);
  console.log('2️⃣ Token verification:');
  console.log(`   Token: ${extracted.substring(0, 60)}...`);
  console.log(`   JWT_SECRET: ${JWT_SECRET}`);
  console.log(`   Result: ${verified ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (verified) {
    console.log(`   Decoded: ${JSON.stringify(verified, null, 2)}`);
  }
} else {
  console.log('❌ Skipping verification - token extraction failed');
}

// Test 3: Try to create a fresh token
console.log('\n3️⃣ Creating fresh token for comparison:');
const freshToken = jwt.sign(
  {
    userId: '273ce892-c1e6-480e-b6e3-cddb3f168d91',
    email: 'learner2@test.com',
    role: 'user'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
console.log(`   Fresh token: ${freshToken.substring(0, 60)}...`);

const freshVerified = verifyJWT(freshToken);
console.log(`   Verification: ${freshVerified ? '✅ SUCCESS' : '❌ FAILED'}`);
