import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, MongoClient } from "mongodb";
import { CollectionName } from "#/common/mongo";

/**
 * Add `__v` to primary collection to explicitly mark record shape evolution.
 */
export class add_schema_version implements MigrationInterface {
  #collections = [
    CollectionName.Accounts,
    CollectionName.Schemas,
    CollectionName.Queries,
  ];

  #dbNamePrimary: string;

  constructor() {
    if (!process.env.APP_DB_NAME_PRIMARY) {
      throw new Error("process.env.APP_DB_NAME_PRIMARY is undefined");
    }
    this.#dbNamePrimary = process.env.APP_DB_NAME_PRIMARY;
  }

  public async up(_db: Db, client: MongoClient): Promise<void> {
    const primary = client.db(this.#dbNamePrimary);
    for (const name of this.#collections) {
      try {
        const result = await primary
          .collection(name)
          .updateMany({}, { $set: { __v: 1 } });

        console.warn(
          `add_schema_version(up): modified ${result.modifiedCount} documents in ${name}`,
        );
      } catch (error) {
        console.error(
          `add_schema_version(up): Failed to add __v to collection ${name}:`,
          error,
        );
        throw error;
      }
    }
  }

  public async down(_db: Db, client: MongoClient): Promise<void> {
    const primary = client.db(this.#dbNamePrimary);
    for (const name of this.#collections) {
      try {
        const result = await primary
          .collection(name)
          .updateMany({}, { $unset: { __v: "" } });

        console.warn(
          `add_schema_version(down): modified ${result.modifiedCount} documents in ${name}`,
        );
      } catch (error) {
        console.error(
          `add_schema_version(down): Failed to remove __v from collection ${name}:`,
          error,
        );
        throw error;
      }
    }
  }
}
