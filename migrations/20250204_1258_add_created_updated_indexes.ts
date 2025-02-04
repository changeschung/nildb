import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, IndexDescription, MongoClient } from "mongodb";

/**
 * Add `_created` and `_updated` as indexes on all data collections
 */
export class add_created_updated_indexes implements MigrationInterface {
  #dbNameData: string;

  constructor() {
    if (!process.env.APP_DB_NAME_DATA) {
      throw new Error("process.env.APP_DB_NAME_DATA is undefined");
    }
    this.#dbNameData = process.env.APP_DB_NAME_DATA;
  }

  public async up(_db: Db, client: MongoClient): Promise<void> {
    const data = client.db(this.#dbNameData);
    const collections = await data.collections();
    const names = collections.map((collection) => collection.collectionName);

    for (const name of names) {
      try {
        const existingIndexes = await data
          .collection(name)
          .listIndexes()
          .toArray();

        const existingIndexNames = existingIndexes.map((index) => index.name);
        const indexesToCreate = [
          {
            key: { _created: 1 } as const,
            name: "_created_1",
            unique: false,
            background: true,
          },
          {
            key: { _updated: 1 } as const,
            name: "_updated_1",
            unique: false,
            background: true,
          },
        ].filter((index) => !existingIndexNames.includes(index.name));

        if (indexesToCreate.length === 0) {
          console.warn(
            `add_created_updated_indexes(up): indexes already exist on ${name}, skipping`,
          );
          continue;
        }

        await data
          .collection(name)
          .createIndexes(indexesToCreate as unknown as IndexDescription[]);

        console.warn(
          `add_created_updated_indexes(up): created ${indexesToCreate.length} indexes on ${name}`,
        );
      } catch (error) {
        console.error(
          `add_created_updated_indexes(up): Failed to create indexes on collection ${name}:`,
          error,
        );
        throw error;
      }
    }
  }

  public async down(_db: Db, client: MongoClient): Promise<void> {
    const data = client.db(this.#dbNameData);
    const collections = await data.collections();
    const names = collections.map((collection) => collection.collectionName);

    for (const name of names) {
      try {
        await Promise.all([
          data.collection(name).dropIndex("_created_1"),
          data.collection(name).dropIndex("_updated_1"),
        ]);

        console.warn(
          `add_created_updated_indexes(down): dropped indexes: _created_1 and _updated_1 on ${name}`,
        );
      } catch (error) {
        console.error(
          `add_created_updated_indexes(down): Failed to drop indexes on collection ${name}:`,
          error,
        );
        throw error;
      }
    }
  }
}
