import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, MongoClient } from "mongodb";
import { CollectionName } from "#/common/mongo";

/**
 * Remove `keys` from schema documents in preparation for a manual schema index endpoint.
 */
export class drop_schema_keys implements MigrationInterface {
  #dbNamePrimary: string;

  constructor() {
    if (!process.env.APP_DB_NAME_PRIMARY) {
      throw new Error("process.env.APP_DB_NAME_PRIMARY is undefined");
    }
    this.#dbNamePrimary = process.env.APP_DB_NAME_PRIMARY;
  }

  public async up(_db: Db, client: MongoClient): Promise<void> {
    const primary = client.db(this.#dbNamePrimary);
    try {
      const collection = primary.collection(CollectionName.Schemas);
      const result = await collection.updateMany(
        { keys: { $exists: true } },
        { $unset: { keys: "" } },
      );

      console.warn(
        `drop_schema_keys(up): Removed keys from ${result.modifiedCount} documents in ${CollectionName.Schemas}`,
      );
    } catch (error) {
      console.error(
        `drop_schema_keys(up): Failed to removed keys from ${CollectionName.Schemas}:`,
        error,
      );
      throw error;
    }
  }

  public async down(_db: Db, _client: MongoClient): Promise<void> {
    console.warn(
      "drop_schema_keys(down): No down migration implemented - keys cannot be restored",
    );
  }
}
