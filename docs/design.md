# Design scratch pad

## Assumptions

- FEs not querying on every request against their API/backend ... more like every 5 minutes
- Data that doesn't meet schema is rejected in its entirety
- For primary key conflicts we update / replace the record

## Future goals

- rollups / hooks
- need custom attribute for bespoke crypto

## Second use case

Insert { flag: int, proof: string }
Query by single record and return all attributes

## Dbs and Collections

1. data_blocks
   - users (nil-db user accounts, eg admin and org)
   - orgs

2. data_blocks_org_id
    - schema_id

3. prefix 'test_' for a test run

## Routes

```
// User authentication for all user types (eg org user and admins)
POST   /api/v1/auth/login                   // Login action request { user, pass } returns { token: jwt }
POST   /api/v1/auth/logout                  // Logout action

// Admin user endpoints
POST   /api/v1/admin/users                  // Create user { user, pass, type, orgId } returns { id: string }
GET    /api/v1/admin/users                  // List users
GET    /api/v1/admin/users/:id              // Get user
DELETE /api/v1/admin/users/:id              // Delete user

// Admin org endpoints 
POST   /api/v1/admin/organizations          // Create org
GET    /api/v1/admin/organizations          // List all
GET    /api/v1/admin/organizations/:id      // Get one
DELETE /api/v1/admin/organizations/:id      // Delete org and associated schema's / queries

```

```http request

### Allow nillion admin to register/create a new project
POST /api/v1/admin/register
Authorization: "Bearer NILLION-TOKEN"

{
   "name": "zap"
   "schemas": []
   "queries": []
}

Response:

{
   token: "aaaaaaaaaaa/bbbbbbb" // give this to org to authenticate requests
}

### Add another query to org
POST /api/v1/admin/org/query
Authorization: "Bearer NILLION-TOKEN"
    
{
   "id":      "zap",
   "queries": $queries[]        // queries to add
   {
      "id: "netflix"
      "on": "command",
      "pipeline": [{ flag: 4 }]
   }
}

### Add another query to org
DELETE /api/v1/admin/org
Authorization: "Bearer NILLION-TOKEN"

{
   "id": "zap"
}

### List org data schemas
GET /api/v1/org/schemas
Authorization: "Bearer ZAP-TOKEN"

Response:

[{ id: "NAME", description: "", documentSchema: "" }]

### List org queries
GET /api/v1/org/query
Authorization: "Bearer ZAP-TOKEN"
Content-Type: application/json

Response:

[{ "id": "walletsByCountry", description: "", responseSchema: "" }, { "id": "walletsByAge", description: "", responseSchema: "" }]

### Delete org user record by (schemaId, primaryKey)
DELETE /api/v1/org/record
Authorization: "Bearer ZAP-TOKEN"
Content-Type: application/json

[
    { schemaId: "", key: "0x1111" },
    { schemaId: "", key: "0x1111" }
]

### Org upload user data for specific schema
POST /api/v1/org/data
Authorization: "Bearer ZAP-TOKEN"
Content-Type: application/json

{
    "schema": "USERS_V1",
    "data": [
        { "wallet": "0x1111", "country": "UK", "age": 21 },
        { "wallet": "0x2222", "country": "UK", "age": 23 },
        { "wallet": "0x4444", "country": "UK", "age": 30 }
    ]
}

Response:

{
    "schema": "USERS_V1",
    "result": "success",
    "data": {}
}

### Org executes query by id
POST /api/v1/org/query
Authorization: "Bearer ZAP-TOKEN"
Content-Type: application/json

{
   "id": "walletsByCountry"
}

Response:

{ "id": "walletsByCountry", data: { "CAN": 11, "GBR: 22 } }
```
