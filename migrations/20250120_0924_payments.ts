import type { MigrationInterface } from "mongo-migrate-ts";
import type { Db, MongoClient } from "mongodb";
import { CollectionName } from "#/common/mongo";

/**
 * Add 'subscription' object to each account and default to active
 */
export class add_active_subscription_boolean implements MigrationInterface {
  public async up(db: Db, client: MongoClient): Promise<void> {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const collection = db.collection(CollectionName.Accounts);
        const result = await collection.updateMany(
          {
            _type: "organization",
          },
          {
            $set: {
              subscription: { active: true },
            },
          },
        );
        console.log(
          `Added _accounts.subscription.active: true_ to ${result.modifiedCount} documents`,
        );
      });
    } finally {
      await session.endSession();
    }
  }

  public async down(db: Db, client: MongoClient): Promise<void> {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const collection = db.collection(CollectionName.Accounts);
        const result = await collection.updateMany(
          {
            _type: "organization",
          },
          {
            $unset: {
              subscription: "",
            },
          },
        );
        console.log(
          `Removed _accounts.subscription_ from ${result.modifiedCount} documents`,
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
