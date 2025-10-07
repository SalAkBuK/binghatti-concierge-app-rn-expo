CONTEXT:
[Tenant Features a) Maintenance Request Related Data: Maintenance Request Table: Create and view requests for maintenance issues. Job Table: Jobs assigned based on maintenance requests. Fields Used: tenant_id, building_id, request_type, status, description, attachment b) Amenities Booking (Pool, Gym) Related Data: Amenities Table: Tenant books slots for amenities. Fields Used: tenant_id, building_id, amenity_type, slot_time, status c) Visitor Management Related Data: Visitor Table: Register visitors with identity details. Fields Used: tenant_id, visitor_id, arrival_time, departure_time, unit_number d) Ratings & Reviews Related Data: Rating Table (for Service Providers & Building Employees): Rate maintenance work, service providers, and employees. Fields Used: tenant_id, service_provider_id, building_employee_id, rating, attachment, description 3. Tenant User Flow Step 1: Tenant logs in with email/password. Step 2: Tenant is redirected to their dashboard. Decision Point: Does the tenant want to: A) Create a maintenance request? → Go to Maintenance Request → Tenant fills in the request and submits. B) Book amenities (pool, gym)? → Go to Amenities Booking → Tenant books a time slot. C) Manage visitors? → Go to Visitor Management → Tenant registers a visitor with required ID details. D) View maintenance updates? → Go to Maintenance History → Tenant can see updates on jobs assigned. E) Rate service providers or building employees? → Go to Ratings & Reviews → Tenant leaves feedback (optional). Step 3: Tenant receives notifications about their requests. Step 4: Tenant logs out or navigates to another task.]

INSTRUCTION:

1. From the CONTEXT above, list clearly and concisely:
   a) "accomplished": items that are explicitly described as present or implicitly trivial to implement (single-line each).
   b) "pending": items that need design or implementation. For each pending item include a one-line reason (e.g., missing endpoint, no UI described, needs attachments support).
2. Produce a prioritized backlog (ordered list) of engineering tasks (frontend + backend) to fully implement Tenant Features (Maintenance Request, Amenities Booking, Visitor Management, Ratings & Reviews). For each backlog item include:
   - id (t<number>),
   - title,
   - type: frontend|backend|db|admin|ops,
   - short description,
   - dependencies (list of other ids),
   - rough estimate in developer-days (small|medium|large),
   - acceptance_criteria (3 bullet points).
3. Answer this question explicitly: "Should we build the Admin Portal and Building Management Portal first, or the Tenant screens first (frontend)?" Provide a single recommended approach and a short rationale (2–4 bullets). Also include an alternative approach if we want faster user-visible progress.
4. For the recommended first step, list the exact API endpoints, DB tables/fields (migrations) and frontend screens/components required to start work. Provide minimal request/response examples for each API.
5. Return only JSON matching the schema provided below (no extra text). Keep each string concise.

RESPONSE_SCHEMA:
{
"accomplished": [ {"item":"", "note":""}, ... ],
"pending": [ {"item":"", "reason":""}, ... ],
"backlog": [
{ "id":"t1","title":"", "type":"frontend|backend|db|admin|ops", "description":"", "dependencies":[ "tX" ], "estimate":"small|medium|large", "acceptance_criteria":[ "...", "...", "..." ] }
],
"recommendation": {
"first_build":"admin_portal" | "tenant_frontend" | "parallel_mixed",
"rationale":[ "...","..." ],
"alternative":[ "...","..." ]
},
"first_step_details": {
"apis":[ { "method":"GET|POST|PUT|DELETE", "path":"/api/...", "body_sample": {...}|null, "response_sample": {...}|null, "notes":"" } ],
"db_migrations":[ { "table":"", "fields":[ {"name":"", "type":"", "notes":"" } ], "notes":"" } ],
"frontend_screens":[ { "name":"", "path":"", "components":[ "..."], "acceptance_criteria":[ "..."] } ]
},
"metadata": { "confidence":0.0-1.0, "steps_taken":[ "..."] }
}
