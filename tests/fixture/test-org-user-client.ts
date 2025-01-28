import type { Response, Test } from "supertest";
import type TestAgent from "supertest/lib/agent";
import { AccountsEndpointV1 } from "#/accounts/accounts.router";
import type { RegisterAccountRequest } from "#/accounts/accounts.types";
import type { Identity } from "#/common/identity";
import { DataEndpointV1 } from "#/data/data.router";
import type {
  DeleteDataRequest,
  FlushDataRequest,
  ReadDataRequest,
  TailDataRequest,
  UpdateDataRequest,
  UploadDataRequest,
} from "#/data/data.types";
import { QueriesEndpointV1 } from "#/queries/queries.router";
import type {
  AddQueryRequest,
  DeleteQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/queries.types";
import type { DeleteSchemaRequest } from "#/schemas/schemas.controllers";
import { SchemasEndpointV1 } from "#/schemas/schemas.router";
import type { AddSchemaRequest } from "#/schemas/schemas.types";
import { SystemEndpoint } from "#/system/system.router";

export type TestClientOptions = {
  request: TestAgent;
  identity: Identity;
  node: {
    endpoint: string;
    identity: Identity;
  };
};

export class TestOrganizationUserClient {
  constructor(public _options: TestClientOptions) {}

  get request(): TestAgent {
    return this._options.request;
  }

  get did() {
    return this._options.identity.did;
  }

  get publicKey() {
    return this._options.identity.pk;
  }

  jwt(): Promise<string> {
    const aud = this._options.node.identity.did;
    return this._options.identity.createJwt({ aud });
  }

  health(): Test {
    return this.request.get(SystemEndpoint.Health);
  }

  about(): Test {
    return this.request.get(SystemEndpoint.About);
  }

  async register(
    body: RegisterAccountRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const response = await this.request
      .post(AccountsEndpointV1.Base)
      .send(body);

    return checkResponse(expectSuccess, response, "registerAccount");
  }

  async getAccount(expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .get(AccountsEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);

    return checkResponse(expectSuccess, response, "getAccount");
  }

  async listSchemas(expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .get(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);

    return checkResponse(expectSuccess, response, "listSchemas");
  }

  async addSchema(body: AddSchemaRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "addSchema");
  }

  async deleteSchema(
    body: DeleteSchemaRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .delete(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteSchema");
  }

  async listQueries(expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .get(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);

    return checkResponse(expectSuccess, response, "listQueries");
  }

  async addQuery(body: AddQueryRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "addQuery");
  }

  async deleteQuery(
    body: DeleteQueryRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .delete(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteQuery");
  }

  async executeQuery(
    body: ExecuteQueryRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(QueriesEndpointV1.Execute)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "executeQuery");
  }

  async uploadData(
    body: UploadDataRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();

    const response = await this.request
      .post(DataEndpointV1.Upload)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "uploadData");
  }

  async deleteData(
    body: DeleteDataRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(DataEndpointV1.Delete)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteData");
  }

  async flushData(body: FlushDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(DataEndpointV1.Flush)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "flushData");
  }

  async tailData(body: TailDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(DataEndpointV1.Tail)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "tailData");
  }

  async readData(body: ReadDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(DataEndpointV1.Read)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "readData");
  }

  async updateData(
    body: UpdateDataRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(DataEndpointV1.Update)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "updateData");
  }
}

export function checkResponse(
  expectSuccess: boolean,
  response: Response,
  method: string,
): Response | never {
  const isFailure = !response.ok && expectSuccess;

  if (isFailure) {
    const message = `Expected success got failure: method=${method}, status=${response.statusCode}`;
    throw new Error(message, { cause: response });
  }

  return response;
}
