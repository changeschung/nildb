import type { ObjectId } from "mongodb";
import type { Temporal } from "temporal-polyfill";

/**
 *
 * Controller types
 */
export type ConfigDocument = {
  _id: ObjectId;
  _created: Date;
  _updated: Date;
  _type: "maintenance";
  window?: {
    start: Date;
    end: Date;
  };
};

/**
 *
 * Repository types
 */
export type MaintenanceWindow = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};
