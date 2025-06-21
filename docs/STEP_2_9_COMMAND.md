# STEP\_2\_9\_COMMAND.md — Auth, Roles, JWT and Access Control

## ✅ Project Context Summary

FuelSync Hub supports multi-role authentication and authorization across tenants and platform. This step implements secure login and access control across all APIs.

## 📌 Prior Steps Implemented

* ✅ `STEP_2_8`: Reconciliation logic and APIs
* ✅ All prior domain features (sales, readings, deliveries, creditors, pricing)

## 🚧 What to Build Now

### 1. JWT Auth Flow

* `POST /api/auth/login`

  * Input: email, password
  * Output: signed JWT token with `role`, `user_id`, `tenant_id`

### 2. Middleware

* `authenticateJWT`: Parse token, attach user context
* `requireRole(roles: string[])`: Check for role access
* `checkStationAccess`: Verify user → station mapping (via `user_stations`)

### 3. SuperAdmin Auth

* Separate route prefix `/admin-api`
* Auth based on `admin_users` table

### 4. Secure All Routes

* Ensure all routes from Steps 2.1–2.8 are wrapped in:

  ```ts
  authenticateJWT → requireRole([...]) → controller
  ```

## 📁 File Paths

```
src/
├── middleware/auth.middleware.ts
├── services/auth.service.ts
├── routes/auth.route.ts
├── controllers/auth.controller.ts
```

## 🧠 Why This Step

Prevents unauthorized data access and enforces tenant separation across API.

## 🧾 Docs To Update

* `CHANGELOG.md`: Feature — login, JWT, RBAC
* `PHASE_2_SUMMARY.md`: Add auth module summary
* `IMPLEMENTATION_INDEX.md`: Add STEP\_2\_9
* `AUTH.md`: Add full auth strategy and examples
* `BUSINESS_RULES.md`: Access control logic
