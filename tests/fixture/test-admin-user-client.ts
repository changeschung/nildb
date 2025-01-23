import type { Test } from "supertest";
import type TestAgent from "supertest/lib/agent";
import type {
  AddQueryRequest,
  AddSchemaRequest,
  CreateAccountRequest,
  DeleteAccountRequest,
  DeleteQueryRequest,
  DeleteSchemaRequest,
  SetAccountSubscriptionStateRequest,
} from "#/admin/controllers";
import { AdminEndpointV1 } from "#/admin/routes";
import type { Identity } from "#/common/identity";
import type {
  DeleteDataRequest,
  FlushDataRequest,
  ReadDataRequest,
  TailDataRequest,
  UpdateDataRequest,
  UploadDataRequest,
} from "#/data/controllers";
import type { ExecuteQueryRequest } from "#/queries/controllers";
import type {} from "#/schemas/controllers";
import { SystemEndpoint } from "#/system/routes";
import { checkResponse } from "./test-org-user-client";

export type TestClientOptions = {
  request: TestAgent;
  identity: Identity;
  node: {
    endpoint: string;
    identity: Identity;
  };
};

export class TestAdminUserClient {
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

  async listAccounts(expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .get(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`);

    return checkResponse(expectSuccess, response, "listAccounts");
  }

  async createAccount(
    body: CreateAccountRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "createAccount");
  }

  async deleteAccount(
    body: DeleteAccountRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .delete(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteAccount");
  }

  async addSchema(body: AddSchemaRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Schemas.Base)
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
      .delete(AdminEndpointV1.Schemas.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteSchema");
  }

  async addQuery(body: AddQueryRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Queries.Base)
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
      .delete(AdminEndpointV1.Queries.Base)
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
      .post(AdminEndpointV1.Queries.Execute)
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
      .post(AdminEndpointV1.Data.Upload)
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
      .post(AdminEndpointV1.Data.Delete)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "deleteData");
  }

  async flushData(body: FlushDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Data.Flush)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "flushData");
  }

  async tailData(body: TailDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Data.Tail)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "tailData");
  }

  async readData(body: ReadDataRequest, expectSuccess = true): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Data.Read)
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
      .post(AdminEndpointV1.Data.Update)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "updateData");
  }

  async setSubscriptionState(
    body: SetAccountSubscriptionStateRequest,
    expectSuccess = true,
  ) {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Accounts.Subscriptions)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "setSubscriptionState");
  }
}
