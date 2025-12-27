For the management portal (mobile), these are the core APIs to wire:

Auth + profile

POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/change-password
GET /api/users/me
PATCH /api/users/me/profile
GET /api/users/me/assignments → know which buildings + role type
Buildings to scope the list

GET /api/org/buildings/assigned
(use this to show only the manager’s buildings)
Requests (list + detail)

GET /api/org/buildings/:buildingId/requests
Query: status=OPEN|ASSIGNED|IN_PROGRESS|COMPLETED|CANCELED
GET /api/org/buildings/:buildingId/requests/:requestId
Assign staff

POST /api/org/buildings/:buildingId/requests/:requestId/assign
Body: { staffUserId }
GET /api/org/buildings/:buildingId/assignments
(use to list staff + managers for the assignment picker)
Status updates

POST /api/org/buildings/:buildingId/requests/:requestId/status
Body: { status: "IN_PROGRESS" | "COMPLETED" }
Comments

POST /api/org/buildings/:buildingId/requests/:requestId/comments { message }
GET /api/org/buildings/:buildingId