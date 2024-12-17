import type { Test } from "supertest";
import type TestAgent from "supertest/lib/agent";
import type {
  RegisterAccountRequest,
  RemoveAccountRequest,
} from "#/accounts/controllers";
import { AccountsEndpointV1 } from "#/accounts/routes";
import type { Identity } from "#/common/identity";
import type {
  CreateDataRequest,
  DeleteDataRequest,
  FlushDataRequest,
  ReadDataRequest,
  TailDataRequest,
  UpdateDataRequest,
} from "#/data/controllers";
import { DataEndpointV1 } from "#/data/routes";
import type {
  AddQueryRequest,
  DeleteQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/controllers";
import { QueriesEndpointV1 } from "#/queries/routes";
import type {
  AddSchemaRequest,
  DeleteSchemaRequest,
} from "#/schemas/controllers";
import { SchemasEndpointV1 } from "#/schemas/routes";
import { SystemEndpoint } from "#/system/routes";

export type TestClientOptions = {
  request: TestAgent;
  identity: Identity;
  node: {
    endpoint: string;
    identity: Identity;
  };
};

export class TestClient {
  constructor(public _options: TestClientOptions) {}

  get request(): TestAgent {
    return this._options.request;
  }

  get did() {
    return this._options.identity.did;
  }

  get publicKey() {
    return this._options.identity.publicKey;
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

  async listAccounts(): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .get(AccountsEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);
  }

  async registerAccount(body: RegisterAccountRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(AccountsEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async deleteAccount(body: RemoveAccountRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .delete(AccountsEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async listSchemas(): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .get(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);
  }

  async addSchema(body: AddSchemaRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async deleteSchema(body: DeleteSchemaRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .delete(SchemasEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async listQueries(): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .get(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`);
  }

  async addQuery(body: AddQueryRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async deleteQuery(body: DeleteQueryRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .delete(QueriesEndpointV1.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async executeQuery(body: ExecuteQueryRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(QueriesEndpointV1.Execute)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async uploadData(body: CreateDataRequest): Promise<Test> {
    const token = await this.jwt();

    return this.request
      .post(DataEndpointV1.Create)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async deleteData(body: DeleteDataRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(DataEndpointV1.Delete)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async flushData(body: FlushDataRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(DataEndpointV1.Flush)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async tailData(body: TailDataRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(DataEndpointV1.Tail)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async readData(body: ReadDataRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(DataEndpointV1.Read)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }

  async updateData(body: UpdateDataRequest): Promise<Test> {
    const token = await this.jwt();
    return this.request
      .post(DataEndpointV1.Update)
      .set("Authorization", `Bearer ${token}`)
      .send(body);
  }
}
