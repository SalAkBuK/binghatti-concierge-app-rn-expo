# Admin Role API Modules

The admin backend now ships as small, ADHD-friendly specs. Each numbered module lives in its own markdown file so your backend partner can tackle them one by one without rereading a giant document.

1. Start with `APIs/Admin/00-Admin API Conventions.md` for shared response envelopes, auth expectations, and validation rules.
2. Pick the module you want to implement next from the list below.

| Order | Module | Description | File |
| --- | --- | --- | --- |
| 01 | User Management | CRUD endpoints for admin-created users plus role-specific payloads. | `APIs/Admin/01-User Management.md` |
| 02 | Building Management | Building creation, assignment, and listing APIs. | `APIs/Admin/02-Building Management.md` |
| 03 | Role & Permission Governance | Permission matrix reads/updates. | `APIs/Admin/03-Role Permissions.md` |
| 04 | Unit Type Catalog | Template CRUD for apartments/unit mixes. | `APIs/Admin/04-Unit Types.md` |
| 05 | Jobs & Workflow Management | Work order list/create/update/assign endpoints. | `APIs/Admin/05-Jobs.md` |
| 06 | Analytics & Dashboard | Portfolio snapshot + recent activity feeds. | `APIs/Admin/06-Analytics.md` |
| 07 | Notifications & Activity Feed | Notification inbox fetch + read actions. | `APIs/Admin/07-Notifications.md` |

Feel free to clone a single file into your ticket description, implement it, then move on to the next number. Every spec references the relevant Expo screen and TypeScript types so you always know which UI wireframes depend on the endpoint.
