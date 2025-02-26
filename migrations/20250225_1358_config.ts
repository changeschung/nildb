import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, MongoClient } from "mongodb";
import { CollectionName } from "#/common/mongo";

/**
 * Add `config` collection
 */
export class add_config_collection implements MigrationInterface {
  #dbNamePrimary: string;

  constructor() {
    if (!process.env.APP_DB_NAME_PRIMARY) {
      throw new Error("process.env.APP_DB_NAME_PRIMARY is undefined");
    }
    this.#dbNamePrimary = process.env.APP_DB_NAME_PRIMARY;
  }

  public async up(_db: Db, client: MongoClient): Promise<void> {
    const primary = client.db(this.#dbNamePrimary);
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await primary.createCollection(CollectionName.Config);
      });
    } finally {
      await session.endSession();
    }
  }

  public async down(_db: Db, client: MongoClient): Promise<void> {
    const primary = client.db(this.#dbNamePrimary);
    const session = client.startSession();
    try {
      await primary.dropCollection(CollectionName.Config);
    } finally {
      await session.endSession();
    }
  }
}
