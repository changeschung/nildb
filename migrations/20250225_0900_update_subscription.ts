import type { MigrationInterface } from "mongo-migrate-ts";
import type { Collection, Db, MongoClient } from "mongodb";
import { advance } from "#/common/date";
import { CollectionName } from "#/common/mongo";

/**
 * Add 'subscription' object to each account and default to active
 */
export class update_subscriptions implements MigrationInterface {
  public async up(db: Db, client: MongoClient): Promise<void> {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const collection = db.collection(CollectionName.Accounts);
        const now = new Date();
        await upSubscriptions(collection, true, now, advance(now, 30));
        await upSubscriptions(collection, false, now, now);
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
        const now = new Date();
        const isSubscriptionActive = {
          $and: [
            { subscription: { start: { $gte: ["$start", now] } } },
            { subscription: { end: { $lte: ["$end", now] } } },
          ],
        };
        await downSubscriptions(collection, isSubscriptionActive, true);
        const isNotSubscriptionActive = {
          $not: isSubscriptionActive,
        };
        await downSubscriptions(collection, isNotSubscriptionActive, false);
      });
    } finally {
      await session.endSession();
    }
  }
}

async function upSubscriptions(
  collection: Collection,
  active: boolean,
  start: Date,
  end: Date,
): Promise<void> {
  console.log(active);
  const result = await collection.updateMany(
    {
      _type: "organization",
      subscription: { active },
    },
    {
      $set: {
        subscription: {
          start,
          end,
          txHash: "",
        },
      },
    },
  );
  console.log(
    `Added _accounts.subscription.start: ${start} to ${result.modifiedCount} documents`,
  );
  console.log(
    `Added _accounts.subscription.end: ${end} to ${result.modifiedCount} documents`,
  );
}

async function downSubscriptions(
  collection: Collection,
  $expr: Record<string, unknown>,
  active: boolean,
): Promise<void> {
  const result = await collection.updateMany(
    {
      _type: "organization",
      $expr,
    },
    {
      $set: {
        subscription: {
          active,
        },
      },
    },
  );
  console.log(
    `Added _accounts.subscription.active: ${active}_ from ${result.modifiedCount} documents`,
  );
}
