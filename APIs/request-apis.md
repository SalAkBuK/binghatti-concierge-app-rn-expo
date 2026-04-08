Tenant/resident maintenance request APIs (all include attachments + comments support):

Create request (attachments supported):

POST /api/resident/requests
- Body: `{ title, description?, type?, priority?, attachments?: [{ fileName, mimeType, sizeBytes, url }] }`
- Uses resident ACTIVE occupancy to select building/unit
  - `type` values: `CLEANING` | `ELECTRICAL` | `MAINTENANCE` | `PLUMBING_AC_HEATING` | `OTHER`
  - `priority` values: `LOW` | `MEDIUM` | `HIGH`
List my requests:

GET /api/resident/requests
Get request detail:

GET /api/resident/requests/:requestId
Update request (only while OPEN):

PATCH /api/resident/requests/:requestId
- Body: `{ title?, description?, type?, priority?, isEmergency?, emergencySignals? }`
Cancel request:

POST /api/resident/requests/:requestId/cancel
Comments:

POST /api/resident/requests/:requestId/comments { message }
GET /api/resident/requests/:requestId/comments
So yes—attachments are in the create payload, and comments have their own create/list endpoints.


