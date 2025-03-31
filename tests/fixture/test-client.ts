import type { DidString, Keypair } from "@nillion/nuc";
import type {
  RegisterAccountRequest,
  SetPublicKeyRequest,
} from "#/accounts/accounts.types";
import type {
  AdminAddQueryRequest,
  AdminAddSchemaRequest,
  AdminCreateAccountRequest,
  AdminDeleteAccountRequest,
  AdminSetLogLevelRequest,
  AdminSetMaintenanceWindowRequest,
  AdminSetSubscriptionStateRequest,
} from "#/admin/admin.types";
import type { App } from "#/app";
import { createJwt } from "#/common/jwt";
import { PathsBeta, PathsV1 } from "#/common/paths";
import type { UuidDto } from "#/common/types";
import type {
  DeleteDataRequest,
  FlushDataRequest,
  ReadDataRequest,
  TailDataRequest,
  UpdateDataRequest,
  UploadDataRequest,
} from "#/data/data.types";
import type {
  AddQueryRequest,
  DeleteQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/queries.types";
import type {
  AddSchemaRequest,
  DeleteSchemaRequest,
} from "#/schemas/schemas.types";
import { SystemEndpoint } from "#/system/system.router";

export type TestClientOptions = {
  app: App;
  keypair: Keypair;
  node: {
    keypair: Keypair;
    endpoint: string;
  };
};

abstract class TestClient {
  constructor(public _options: TestClientOptions) {}

  get app(): App {
    return this._options.app;
  }

  get did(): DidString {
    return this._options.keypair.toDidString();
  }

  get keypair() {
    return this._options.keypair;
  }

  jwt(): Promise<string> {
    return createJwt(
      { aud: this._options.node.keypair.toDidString() },
      this.keypair,
    );
  }

  async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "DELETE";
      body?: T;
    } = {},
  ): Promise<Response> {
    const { method = "GET", body } = options;
    const token = await this.jwt();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    return this.app.request(path, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });
  }

  async health(): Promise<Response> {
    return this.app.request(SystemEndpoint.Health);
  }

  async about(): Promise<Response> {
    return this.app.request(SystemEndpoint.About);
  }
}

export class TestRootUserClient extends TestClient {
  async createAccount(body: AdminCreateAccountRequest): Promise<Response> {
    return this.request(PathsV1.admin.accounts.root, { method: "POST", body });
  }
}

export class TestAdminUserClient extends TestRootUserClient {
  async listAccounts(): Promise<Response> {
    return this.request(PathsV1.admin.accounts.root);
  }

  async deleteAccount(body: AdminDeleteAccountRequest): Promise<Response> {
    return this.request(PathsV1.admin.accounts.root, {
      method: "DELETE",
      body,
    });
  }

  async setSubscriptionState(
    body: AdminSetSubscriptionStateRequest,
  ): Promise<Response> {
    return this.request(PathsV1.admin.accounts.subscription, {
      method: "POST",
      body,
    });
  }

  async getSubscriptionState(did: DidString): Promise<Response> {
    return this.request(
      PathsV1.admin.accounts.subscriptionByDid.replace(":did", did),
    );
  }

  async setMaintenanceWindow(
    body: AdminSetMaintenanceWindowRequest,
  ): Promise<Response> {
    return this.request(PathsV1.admin.system.maintenance, {
      method: "POST",
      body,
    });
  }

  async deleteMaintenanceWindow(): Promise<Response> {
    return this.request(PathsV1.admin.system.maintenance, {
      method: "DELETE",
    });
  }

  async getLogLevel(): Promise<Response> {
    return this.request(PathsV1.admin.system.logLevel, {
      method: "GET",
    });
  }

  async setLogLevel(body: AdminSetLogLevelRequest): Promise<Response> {
    return this.request(PathsV1.admin.system.logLevel, {
      method: "POST",
      body,
    });
  }

  async addSchema(body: AdminAddSchemaRequest): Promise<Response> {
    return this.request(PathsV1.admin.schemas.root, { method: "POST", body });
  }

  async getSchemaMetadata(id: UuidDto): Promise<Response> {
    return this.request(`${PathsBeta.admin.schemas.byIdMeta}/${id}`);
  }

  async deleteSchema(body: DeleteSchemaRequest): Promise<Response> {
    return this.request(PathsV1.admin.schemas.root, { method: "DELETE", body });
  }

  async addQuery(body: AdminAddQueryRequest): Promise<Response> {
    return this.request(PathsV1.admin.queries.root, { method: "POST", body });
  }

  async deleteQuery(body: DeleteQueryRequest): Promise<Response> {
    return this.request(PathsV1.admin.queries.root, { method: "DELETE", body });
  }

  async executeQuery(body: ExecuteQueryRequest): Promise<Response> {
    return this.request(PathsV1.admin.queries.execute, {
      method: "POST",
      body,
    });
  }

  async uploadData(body: UploadDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.upload, { method: "POST", body });
  }

  async deleteData(body: DeleteDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.delete, { method: "POST", body });
  }

  async flushData(body: FlushDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.flush, { method: "POST", body });
  }

  async tailData(body: TailDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.tail, { method: "POST", body });
  }

  async readData(body: ReadDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.read, { method: "POST", body });
  }

  async updateData(body: UpdateDataRequest): Promise<Response> {
    return this.request(PathsV1.admin.data.update, { method: "POST", body });
  }
}

export class TestOrganizationUserClient extends TestClient {
  async register(body: RegisterAccountRequest): Promise<Response> {
    return this.request(PathsV1.accounts.root, {
      method: "POST",
      body,
    });
  }

  async getAccount(): Promise<Response> {
    return this.request(PathsV1.accounts.root);
  }

  async getSubscriptionState(): Promise<Response> {
    return this.request(PathsV1.accounts.subscription);
  }

  async updateAccount(body: SetPublicKeyRequest): Promise<Response> {
    return this.request(PathsV1.accounts.publicKey, { method: "POST", body });
  }

  async listSchemas(): Promise<Response> {
    return this.request(PathsV1.schemas.root);
  }

  async getSchemaMetadata(id: UuidDto): Promise<Response> {
    return this.request(PathsBeta.schemas.byIdMeta.replace(":id", id));
  }

  async addSchema(body: AddSchemaRequest): Promise<Response> {
    return this.request(PathsV1.schemas.root, {
      method: "POST",
      body,
    });
  }

  async deleteSchema(body: DeleteSchemaRequest): Promise<Response> {
    return this.request(PathsV1.schemas.root, {
      method: "DELETE",
      body,
    });
  }

  async listQueries(): Promise<Response> {
    return this.request(PathsV1.queries.root);
  }

  async addQuery(body: AddQueryRequest): Promise<Response> {
    return this.request(PathsV1.queries.root, {
      method: "POST",
      body,
    });
  }

  async deleteQuery(body: DeleteQueryRequest): Promise<Response> {
    return this.request(PathsV1.queries.root, {
      method: "DELETE",
      body,
    });
  }

  async executeQuery(body: ExecuteQueryRequest): Promise<Response> {
    return this.request(PathsV1.queries.execute, {
      method: "POST",
      body,
    });
  }

  async uploadData(body: UploadDataRequest): Promise<Response> {
    return this.request(PathsV1.data.upload, {
      method: "POST",
      body,
    });
  }

  async deleteData(body: DeleteDataRequest): Promise<Response> {
    return this.request(PathsV1.data.delete, {
      method: "POST",
      body,
    });
  }

  async flushData(body: FlushDataRequest): Promise<Response> {
    return this.request(PathsV1.data.flush, {
      method: "POST",
      body,
    });
  }

  async tailData(body: TailDataRequest): Promise<Response> {
    return this.request(PathsV1.data.tail, {
      method: "POST",
      body,
    });
  }

  async readData(body: ReadDataRequest): Promise<Response> {
    return this.request(PathsV1.data.read, {
      method: "POST",
      body,
    });
  }

  async updateData(body: UpdateDataRequest): Promise<Response> {
    return this.request(PathsV1.data.update, {
      method: "POST",
      body,
    });
  }
}
