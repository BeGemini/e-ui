# API Route Contracts: Authentication

**Feature**: English Listening Dictation Practice App  
**Version**: 1.0.0  
**Last Updated**: 2026-09-09

---

## POST /api/auth/register

**Purpose**: Create a new user account with invitation code validation

**Authentication**: None (public endpoint)

**Request**:
```typescript
{
  code: string;           // Invitation code (required, 8+ chars)
  email: string;          // Email address (required, valid email format)
  password: string;       // Password (required, min 8 chars, mixed case + numbers)
  passwordConfirm: string; // Password confirmation (must match password)
}
```

**Response (201 Created)**:
```typescript
{
  userId: string;         // UUID of created user
  email: string;          // Email address
  token: string;          // JWT/session token for auth
  role: "user";           // Always "user" for new registrations
  registrationDate: string; // ISO 8601 timestamp
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 400 | Missing required fields | `{ error: "Missing required fields: [field names]" }` |
| 400 | Invalid email format | `{ error: "Invalid email format" }` |
| 400 | Password too short | `{ error: "Password must be at least 8 characters" }` |
| 400 | Passwords don't match | `{ error: "Passwords do not match" }` |
| 400 | Invalid invitation code | `{ error: "Invalid or expired invitation code" }` |
| 400 | Code already used | `{ error: "Invitation code already used" }` |
| 409 | Email already registered | `{ error: "Email already registered" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Validate email format (RFC 5322 compliant)
2. Validate password (min 8 chars, must contain uppercase, lowercase, number)
3. Verify passwords match
4. Query InvitationCode table by code
5. Verify code exists, not expired (expiryDate > NOW), not used (isUsed = false)
6. Check email uniqueness in User table
7. Hash password (bcrypt, cost factor 12)
8. Create User record with role="user"
9. Update InvitationCode (isUsed=true, usedByUserId=new userId)
10. Generate session/JWT token
11. Return success with token

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123XYZ",
    "email": "learner@example.com",
    "password": "SecurePass123",
    "passwordConfirm": "SecurePass123"
  }'
```

---

## POST /api/auth/login

**Purpose**: Authenticate user and create session

**Authentication**: None (public endpoint)

**Request**:
```typescript
{
  email: string;    // Email address (required)
  password: string; // Password (required)
}
```

**Response (200 OK)**:
```typescript
{
  userId: string;  // UUID of authenticated user
  email: string;   // Email address
  token: string;   // JWT/session token
  role: "admin" | "user"; // User's role
  lastLoginDate: string; // ISO 8601 timestamp
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 400 | Missing fields | `{ error: "Missing required fields: [field names]" }` |
| 401 | Invalid credentials | `{ error: "Invalid email or password" }` |
| 401 | Account disabled | `{ error: "Account is disabled" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Query User by email (case-insensitive)
2. If user not found or isActive = false, return 401
3. Verify password hash (bcrypt compare)
4. If mismatch, return 401
5. Update User.lastLoginDate to NOW()
6. Generate session/JWT token
7. Return success with token

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "learner@example.com",
    "password": "SecurePass123"
  }'
```

---

## POST /api/auth/logout

**Purpose**: End user session

**Authentication**: Required (Bearer token or session cookie)

**Request**:
```typescript
{}  // Empty body
```

**Response (200 OK)**:
```typescript
{
  success: boolean; // Always true
  message: string;  // "Logged out successfully"
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Missing token | `{ error: "Unauthorized - missing token" }` |
| 401 | Invalid token | `{ error: "Unauthorized - invalid token" }` |
| 500 | Database error | `{ error: "Internal server error" }` |

**Business Logic**:
1. Extract token from Authorization header or session cookie
2. Validate token (check signature, expiry, blacklist if using JWT)
3. Clear session state
4. Return success

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## GET /api/auth/me

**Purpose**: Get current authenticated user's profile

**Authentication**: Required (Bearer token or session cookie)

**Request**:
```typescript
{}  // No query parameters or body
```

**Response (200 OK)**:
```typescript
{
  userId: string;
  email: string;
  role: "admin" | "user";
  registrationDate: string;
  lastLoginDate: string;
  isActive: boolean;
}
```

**Errors**:

| Code | Condition | Response |
|------|-----------|----------|
| 401 | Missing token | `{ error: "Unauthorized" }` |
| 401 | Invalid token | `{ error: "Unauthorized" }` |
| 404 | User not found | `{ error: "User not found" }` |

**Business Logic**:
1. Extract userId from token
2. Query User by userId
3. Return user profile (omit passwordHash)

**Example Usage**:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Error Response Format (Standard)

All error responses follow this format:

```typescript
{
  error: string;           // Error message
  code?: string;           // Optional error code for client handling
  details?: Record<string, string>; // Optional validation errors
  timestamp?: string;      // ISO 8601 timestamp
}
```

**Example Validation Error**:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Must contain uppercase letter"
  }
}
```

---

## HTTP Status Codes

| Code | Use Case |
|------|----------|
| 200 | Request succeeded |
| 201 | Resource created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (email already exists) |
| 500 | Server error |

---

## Security Considerations

1. **Password Storage**: Use bcrypt (cost 12+), never log passwords
2. **Token Expiry**: JWT should expire in 24-48 hours
3. **Rate Limiting**: Implement on /register and /login (max 5 attempts/minute per IP)
4. **HTTPS Only**: All auth endpoints must use HTTPS in production
5. **CORS**: Allow credentials and set appropriate Access-Control headers
6. **SQL Injection**: Use parameterized queries; never concatenate user input
7. **Email Verification**: Consider requiring email verification for new registrations (v2.0 enhancement)

---

## TypeScript Types (for reference)

```typescript
// Request types
interface RegisterRequest {
  code: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Response types
interface AuthResponse {
  userId: string;
  email: string;
  token: string;
  role: "admin" | "user";
  registrationDate: string;
  lastLoginDate: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string>;
  timestamp?: string;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}
```
