import type { Hono } from "hono";
import pino from "pino";
import type { AppEnv } from "#/app";
import type { HealthCheckPath } from "#/handlers/admin-handle-health-check";
import type { AuthLoginHandler } from "#/handlers/auth-handle-login";
import type { UploadDataHandler } from "#/handlers/data-handle-upload";
import type { CreateOrganizationHandler } from "#/handlers/organizations-handle-create";
import type { CreateOrganizationAccessTokenHandler } from "#/handlers/organizations-handle-create-access-token";
import type { DeleteOrganizationHandler } from "#/handlers/organizations-handle-delete";
import type { AddQueryHandler } from "#/handlers/queries-handle-add";
import type { DeleteQueryHandler } from "#/handlers/queries-handle-delete";
import type { ExecuteQueryHandler } from "#/handlers/queries-handle-execute";
import type { ListQueriesHandler } from "#/handlers/queries-handle-list";
import type { AddSchemaHandler } from "#/handlers/schemas-handle-add";
import type { DeleteSchemaHandler } from "#/handlers/schemas-handle-delete";
import type { ListSchemasHandler } from "#/handlers/schemas-handle-list";
import type { CreateUserHandler } from "#/handlers/users-handle-create";
import type { DeleteUserHandler } from "#/handlers/users-handle-delete";

export type TestClientOptions = {
  app: Hono<AppEnv>;
  email: string;
  password: string;
  jwt: string;
};

const apiV1 = "/api/v1";

export class TestClient {
  _log = pino();

  constructor(public _options: TestClientOptions) {}

  get app(): Hono<AppEnv> {
    return this._options.app;
  }

  get email(): string {
    return this._options.email;
  }

  get password(): string {
    return this._options.password;
  }

  set jwt(value: string) {
    this._options.jwt = value;
  }

  get jwt() {
    return this._options.jwt;
  }

  async health(): Promise<"OK"> {
    const path: HealthCheckPath = "/health";
    const response = await this.app.request(path);
    return (await response.text()) as "OK";
  }

  async login(): Promise<AuthLoginHandler["response"]> {
    const request: AuthLoginHandler["request"] = {
      email: this._options.email,
      password: this._options.password,
    };
    const path: AuthLoginHandler["path"] = `${apiV1}/auth/login`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as AuthLoginHandler["response"];
  }

  async createUser(
    request: CreateUserHandler["request"],
  ): Promise<CreateUserHandler["response"]> {
    const path: CreateUserHandler["path"] = `${apiV1}/users`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.jwt}`,
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as CreateUserHandler["response"];
  }

  async deleteUser(
    request: DeleteUserHandler["request"],
  ): Promise<DeleteUserHandler["response"]> {
    const path: DeleteUserHandler["path"] = `${apiV1}/users`;
    const response = await this.app.request(path, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as DeleteUserHandler["response"];
  }

  async createOrganization(
    request: CreateOrganizationHandler["request"],
  ): Promise<CreateOrganizationHandler["response"]> {
    const path: CreateOrganizationHandler["path"] = `${apiV1}/organizations`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as CreateOrganizationHandler["response"];
  }

  async deleteOrganization(
    request: DeleteOrganizationHandler["request"],
  ): Promise<DeleteOrganizationHandler["response"]> {
    const path: DeleteOrganizationHandler["path"] = `${apiV1}/organizations`;
    const response = await this.app.request(path, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as DeleteOrganizationHandler["response"];
  }

  async listOrganizations(): Promise<CreateOrganizationHandler["response"]> {
    const path: CreateOrganizationHandler["path"] = `${apiV1}/organizations`;
    const response = await this.app.request(path, {
      method: "GET",
      headers: { authorization: `Bearer ${this.jwt}` },
    });

    const body = await response.json();
    return body as CreateOrganizationHandler["response"];
  }

  async createOrganizationAccessToken(
    request: CreateOrganizationAccessTokenHandler["request"],
  ): Promise<CreateOrganizationAccessTokenHandler["response"]> {
    const path: CreateOrganizationAccessTokenHandler["path"] = `${apiV1}/organizations/access-tokens`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as CreateOrganizationAccessTokenHandler["response"];
  }

  async listSchemas(): Promise<ListSchemasHandler["response"]> {
    const path: ListSchemasHandler["path"] = `${apiV1}/schemas`;
    const response = await this.app.request(path, {
      headers: { authorization: `Bearer ${this.jwt}` },
    });

    const body = await response.json();
    return body as ListSchemasHandler["response"];
  }

  async addSchema(
    request: AddSchemaHandler["request"],
  ): Promise<AddSchemaHandler["response"]> {
    const path: AddSchemaHandler["path"] = `${apiV1}/schemas`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as AddSchemaHandler["response"];
  }

  async uploadData(
    request: UploadDataHandler["request"],
  ): Promise<UploadDataHandler["response"]> {
    const path: UploadDataHandler["path"] = `${apiV1}/data`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as UploadDataHandler["response"];
  }

  async addQuery(
    request: AddQueryHandler["request"],
  ): Promise<AddQueryHandler["response"]> {
    const path: AddQueryHandler["path"] = `${apiV1}/queries`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as AddQueryHandler["response"];
  }

  async listQueries(): Promise<ListQueriesHandler["response"]> {
    const path: ListQueriesHandler["path"] = `${apiV1}/queries`;
    const response = await this.app.request(path, {
      headers: {
        authorization: `Bearer ${this.jwt}`,
      },
    });

    const body = await response.json();
    return body as ListQueriesHandler["response"];
  }

  async executeQuery(
    request: ExecuteQueryHandler["request"],
  ): Promise<ExecuteQueryHandler["response"]> {
    const path: ExecuteQueryHandler["path"] = `${apiV1}/queries/execute`;
    const response = await this.app.request(path, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as ExecuteQueryHandler["response"];
  }

  async deleteQuery(
    request: DeleteQueryHandler["request"],
  ): Promise<DeleteQueryHandler["response"]> {
    const path: DeleteQueryHandler["path"] = `${apiV1}/queries`;

    const response = await this.app.request(path, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as DeleteQueryHandler["response"];
  }

  async deleteSchema(
    request: DeleteSchemaHandler["request"],
  ): Promise<DeleteSchemaHandler["response"]> {
    const path: DeleteSchemaHandler["path"] = `${apiV1}/schemas`;
    const response = await this.app.request(path, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${this.jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();
    return body as DeleteSchemaHandler["response"];
  }
}
