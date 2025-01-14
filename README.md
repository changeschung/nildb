# Welcome to nilDB



## Prerequisites

- Node.js ≥ 23.0
- pnpm
- Docker

## Set up development environment 

1. Clone the repository:
   ```shell
   git clone git@github.com:NillionNetwork/nil-db.git
   cd nil-db
   ```

2. Install dependencies and set up environment:
   ```shell
   pnpm install
   pnpm install-hooks
   cp .env.example .env
   ```

3. If desired, configure your .env file with appropriate values.

## Running the API

1. Start MonogDB:
   ```shell
   docker run -d -p 27017:27017 mongo:8
   ```

2. Start the API:
   ```shell
   pnpm dev # or start for non-watch mode
   ```

## Tests

Run the test suite:
   ```shell
   pnpm test
   ```

**Note:**
- Tests use a dedicated test database
- The test database is dropped at the start of each test run
- Test database state is preserved after runs for inspection

## Getting started

This section provides a high level flow to help orientate yourself as a nilDB admin. 

1. Root credentials are set by the env var `APP_ROOT_USER_SECRET_KEY`.

2. After starting your node you can access its public key with:
    ```shell
    curl ${NODE_URL}/about
   
   {
      "started": "2025-01-14T12:10:30.707Z",
      "build": {
        "time": "1970-01-01T00:00:00Z",
        "commit": "unknown",
        "version": "0.0.0"
      },
      "did": "did:nil:testnet:nillion1eunreuzltxglx9fx493l2r8ef6rdlrau4dsdnc",
      "publicKey": "02d1f198df9a64ffa27c293861bace8c80bd6b1e150e008267f7f94eae9e6c380c",
      "url": "http://localhost:8080"
   }
   ```

3. Now, create a root jwt using the nodes public key and your root secret key:
    ```shell
    tsc bin/credentials.ts --secret-key ${APP_ROOT_USER_SECRET_KEY} --node-public-key ${APP_NODE_PUBLIC_KEY}
    ```

4. Generate admin credentials:
    ```shell
    tsx bin/credentials.ts 
    ```

5. Use the root jwt to create the admin account:
    ```shell
    curl ${NODE_URL}/api/v1/admin/accounts \
      --header "authorization: bearer ${ROOT_JWT}" \
      --header "content-type: application/json" \
      -d '{ "did": "${ADMIN_DID}", "publicKey": "${ADMIN_PK}" }'
    ```
 
6. Once the account is created generate a JWT for your admin and the target node:
   ```shell
   tsx bin/credentials.ts --secret-key ${ADMIN_USER_SECRET_KEY} --node-public-key ${APP_NODE_PUBLIC_KEY}
   ```

## OpenApi Documentation

When the node is running a swagger ui is available at `/api/v1/openapi/docs/`. The UI is based on this [openapi specification](./src/docs/openapi.yaml).

**Note**: Admin routes are not documented.

## Contributing

1.	Open an issue to discuss proposed changes
2.	Submit a pull request with your changes
3.	Ensure all tests pass and documentation is updated
