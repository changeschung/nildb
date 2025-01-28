import type { Test } from "supertest";
import type TestAgent from "supertest/lib/agent";
import { AdminEndpointV1 } from "#/admin/admin.router";
import type { AdminCreateAccountRequest } from "#/admin/admin.types";
import { type TestClientOptions, checkResponse } from "./test-org-user-client";

export class TestRootUserClient {
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

  async createAccount(
    body: AdminCreateAccountRequest,
    expectSuccess = true,
  ): Promise<Test> {
    const token = await this.jwt();
    const response = await this.request
      .post(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    return checkResponse(expectSuccess, response, "createAccount");
  }
}
