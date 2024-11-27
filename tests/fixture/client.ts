import type { Test } from "supertest";
import type TestAgent from "supertest/lib/agent";
import type { LoginRequest } from "#/auth/controllers";
import { AuthEndpoints } from "#/auth/routes";
import {
  type DeleteDataResponse,
  type FlushDataRequest,
  type TailDataRequest,
  type CreateDataRequest,
} from "#/data/controllers";
import { DataEndpoint } from "#/data/routes";
import type {
  CreateOrganizationAccessTokenRequest,
  CreateOrganizationRequest,
  DeleteOrganizationRequest,
} from "#/organizations/controllers";
import { OrganizationsEndpoint } from "#/organizations/routes";
import type {
  AddQueryRequest,
  DeleteQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/controllers";
import { QueriesEndpoint } from "#/queries/routes";
import type {
  AddSchemaRequest,
  DeleteSchemaRequest,
} from "#/schemas/controllers";
import { SchemasEndpoint } from "#/schemas/routes";
import { SystemEndpoint } from "#/system/routes";
import type { CreateUserRequest, DeleteUserRequest } from "#/users/controllers";
import { UsersEndpoint } from "#/users/routes";

export type TestClientOptions = {
  request: TestAgent;
  email: string;
  password: string;
  jwt: string;
};

const apiv1Base = "/api/v1";

export class TestClient {
  constructor(public _options: TestClientOptions) {}

  get request(): TestAgent {
    return this._options.request;
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

  health(): Test {
    return this.request.get(SystemEndpoint.Health);
  }

  version(): Test {
    return this.request.get(SystemEndpoint.Version);
  }

  login(body: LoginRequest): Test {
    return this.request.post(`${apiv1Base}${AuthEndpoints.Login}`).send(body);
  }

  createUser(body: CreateUserRequest): Test {
    return this.request
      .post(`${apiv1Base}${UsersEndpoint.Create}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  deleteUser(body: DeleteUserRequest): Test {
    return this.request
      .delete(`${apiv1Base}${UsersEndpoint.Delete}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  createOrganization(body: CreateOrganizationRequest): Test {
    return this.request
      .post(`${apiv1Base}${OrganizationsEndpoint.Create}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  listOrganizations(): Test {
    return this.request
      .get(`${apiv1Base}${OrganizationsEndpoint.List}`)
      .set("Authorization", `Bearer ${this.jwt}`);
  }

  createOrganizationAccessToken(
    body: CreateOrganizationAccessTokenRequest,
  ): Test {
    return this.request
      .post(`${apiv1Base}${OrganizationsEndpoint.CreateAccessToken}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  deleteOrganization(body: DeleteOrganizationRequest): Test {
    return this.request
      .delete(`${apiv1Base}${OrganizationsEndpoint.Delete}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  listSchemas(): Test {
    return this.request
      .get(`${apiv1Base}${SchemasEndpoint.List}`)
      .set("Authorization", `Bearer ${this.jwt}`);
  }

  addSchema(body: AddSchemaRequest): Test {
    return this.request
      .post(`${apiv1Base}${SchemasEndpoint.Add}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  deleteSchema(body: DeleteSchemaRequest): Test {
    return this.request
      .delete(`${apiv1Base}${SchemasEndpoint.Delete}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  listQueries(): Test {
    return this.request
      .get(`${apiv1Base}${QueriesEndpoint.List}`)
      .set("Authorization", `Bearer ${this.jwt}`);
  }

  addQuery(body: AddQueryRequest): Test {
    return this.request
      .post(`${apiv1Base}${QueriesEndpoint.Add}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  deleteQuery(body: DeleteQueryRequest): Test {
    return this.request
      .delete(`${apiv1Base}${QueriesEndpoint.Delete}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  uploadData(body: CreateDataRequest): Test {
    return this.request
      .post(`${apiv1Base}${DataEndpoint.Create}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  deleteData(body: DeleteDataResponse): Test {
    return this.request
      .post(`${apiv1Base}${DataEndpoint.Delete}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  flushData(body: FlushDataRequest): Test {
    return this.request
      .post(`${apiv1Base}${DataEndpoint.Flush}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  tailData(body: TailDataRequest): Test {
    return this.request
      .post(`${apiv1Base}${DataEndpoint.Tail}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }

  executeQuery(body: ExecuteQueryRequest): Test {
    return this.request
      .post(`${apiv1Base}${QueriesEndpoint.Execute}`)
      .set("Authorization", `Bearer ${this.jwt}`)
      .send(body);
  }
}
