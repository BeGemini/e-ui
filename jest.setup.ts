// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
if (process.env.NODE_ENV !== 'test') {
  // Skip setting NODE_ENV since it's read-only in strict TS
}
if (!process.env.JWT_SECRET) {
  // Jest will use defaults if not set
}
