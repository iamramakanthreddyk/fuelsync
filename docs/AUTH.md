# AUTH.md — Authentication & Access Control Guide

This file defines the login flow, session management, and role-based access strategies used in FuelSync Hub.

---

## 🔐 Authentication Overview

* Users log in with email + password via `/api/v1/auth/login`
* Successful login issues a **JWT token**, stored in **HttpOnly cookie**
* Token contains `user_id`, `tenant_id`, and `role`
* Route handled in `src/routes/auth.route.ts` which invokes `login()` service

---

## 🧪 Token Claims

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant123",
  "role": "manager",
  "iat": 1718880000,
  "exp": 1718966400
}
```

---

## 🧱 Middleware Chain

```ts
authenticateJWT()
  → requireRole("owner" | "manager" | ...)
  → checkStationAccess()
```

Middlewares are implemented in `src/middlewares/*.ts` and attach `req.user` after token verification.

---

## 🚫 Login Failures

* Return `401` for invalid credentials
* Use structured error response:

```json
{
  "status": "error",
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

---

## 🔓 Logout

* Call `/api/v1/auth/logout` to clear the cookie

---

Login and logout routes exist under `/api/auth`. Tokens expire after one hour and must be renewed via re-login.
