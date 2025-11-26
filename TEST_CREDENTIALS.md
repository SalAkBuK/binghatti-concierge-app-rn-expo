# Test Credentials for Tower Desk

All credentials are for **development/testing only** and work with the mock data system.

## Password Policy

- **admin@towerdesk.com**: Uses REAL backend API - requires actual password from backend
- **All other accounts**: Password is NOT validated - use ANY password (e.g., "password", "test123", etc.)

---

## Tenant Accounts

Use ANY password for these accounts.

| Email             | Name           | Role   | Building         | Unit | Phone            |
| ----------------- | -------------- | ------ | ---------------- | ---- | ---------------- |
| tnt               | Tower A        | 1205   | +971 50 123 4567 |
| tenant1@email.com | Sarah Mohammed | tenant | Tower B          | 804  | +971 50 234 5678 |

**Emergency Contacts:**

- Ahmed Al-Rashid: Fatima Al-Rashid (+971 50 987 6543)
- Sarah Mohammed: Omar Mohammed (+971 50 876 5432)

---

## Management Accounts

Use ANY password for these accounts.

| Email               | Name       | Role       | Phone            | Managed Buildings |
| ------------------- | ---------- | ---------- | ---------------- | ----------------- |
| management@demo.com | John Smith | management | +971 50 345 6789 | building-1        |

---

## Admin Accounts

Password requirements vary by account.

| Email               | Name             | Role        | Phone            | Password Validation       |
| ------------------- | ---------------- | ----------- | ---------------- | ------------------------- |
| admin@demo.com      | Admin User       | admin       | +971 50 456 7890 | ❌ ANY password           |
| admin@towerdesk.com | Tower Desk Admin | admin       | +971 50 000 1234 | ✅ REAL password required |
| superadmin@demo.com | Super Admin      | super_admin | +971 50 000 0000 | ❌ ANY password           |

---

## Service Provider Accounts

Use ANY password for these accounts.

| Email        | Name         | Role             | Phone            | Service Type        |
| ------------ | ------------ | ---------------- | ---------------- | ------------------- |
| sp1@demo.com | Mike Johnson | service_provider | +971 50 567 8901 | HVAC Technician     |
| sp2@demo.com | Alex Wilson  | service_provider | +971 50 678 9012 | Elevator Specialist |

---

## Building Employee Accounts

Use ANY password for these accounts.

| Email                 | Name        | Role              | Phone            | Building   | Job Title           |
| --------------------- | ----------- | ----------------- | ---------------- | ---------- | ------------------- |
| concierge@demo.com    | Ali Hassan  | building_employee | +971 50 111 2233 | building-1 | Concierge           |
| housekeeping@demo.com | Maria Gomez | building_employee | +971 55 444 7788 | building-1 | Housekeeping Lead   |
| security@demo.com     | Omar Rahman | building_employee | +971 55 999 3344 | building-2 | Security Supervisor |

---

## Service Provider Employee Accounts

Use ANY password for these accounts.

| Email              | Name              | Role     | Phone            | Service Provider | Specialties           |
| ------------------ | ----------------- | -------- | ---------------- | ---------------- | --------------------- |
| employee1@demo.com | Ahmed Al-Mansoori | employee | +971 50 111 2222 | Mike Johnson     | HVAC, Electrical      |
| employee2@demo.com | Rashid Ibrahim    | employee | +971 50 222 3333 | Mike Johnson     | Plumbing, Carpentry   |
| employee3@demo.com | Khalid Hassan     | employee | +971 50 333 4444 | Alex Wilson      | Elevators, Mechanical |

**Certifications:**

- Ahmed Al-Mansoori: HVAC Level 2, Electrical Safety
- Rashid Ibrahim: Plumbing Professional
- Khalid Hassan: Elevator Maintenance Certified

---

## Quick Login Examples

### Test Tenant Features

```
Email: tenant@demo.com
Password: (any password)
```

### Test Management Features

```
Email: management@demo.com
Password: (any password)
```

### Test Admin Features

```
Email: admin@demo.com
Password: (any password)
```

### Test Building Employee Features

```
Email: concierge@demo.com
Password: (any password)
```

### Test Service Provider Features

```
Email: sp1@demo.com
Password: (any password)
```

### Test Employee Features

```
Email: employee1@demo.com
Password: (any password)
```

---

## User IDs Reference

| User              | ID             |
| ----------------- | -------------- |
| Super Admin       | 0              |
| Ahmed Al-Rashid   | 1              |
| John Smith        | 2              |
| Admin User        | 3              |
| Mike Johnson      | 4              |
| Alex Wilson       | 5              |
| Sarah Mohammed    | 6              |
| Tower Desk Admin  | admin-live     |
| Ali Hassan        | building-emp-1 |
| Maria Gomez       | building-emp-2 |
| Omar Rahman       | building-emp-3 |
| Ahmed Al-Mansoori | sp-emp-1       |
| Rashid Ibrahim    | sp-emp-2       |
| Khalid Hassan     | sp-emp-3       |

---

## Building IDs Reference

| Building Name   | ID         |
| --------------- | ---------- |
| First Building  | building-1 |
| Second Building | building-2 |

---

## Notes

- Mock authentication is configured in `lib/context/auth-context.tsx` (line 401)
- All user data is defined in `lib/utils/mockData.ts`
- For production, use real authentication with the backend API at https://1bnx.online/api
