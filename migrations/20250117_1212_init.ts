import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, MongoClient } from "mongodb";
import { CollectionName } from "#/common/mongo";

/**
 * Setup/teardown primary collections
 */
export class init_collections implements MigrationInterface {
  public async up(db: Db, client: MongoClient): Promise<void> {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all([
          db.createCollection(CollectionName.Accounts),
          db.createCollection(CollectionName.Queries),
          db.createCollection(CollectionName.Schemas),
        ]);
      });
    } finally {
      await session.endSession();
    }
  }

  public async down(db: Db, client: MongoClient): Promise<void> {
    const session = client.startSession();
    try {
      await Promise.all([
        db.dropCollection(CollectionName.Accounts),
        db.dropCollection(CollectionName.Queries),
        db.dropCollection(CollectionName.Schemas),
      ]);
    } finally {
      await session.endSession();
    }
  }
}
