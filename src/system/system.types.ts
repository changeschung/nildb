import type { NilDid } from "#/common/nil-did";

/**
 *
 * Controller types
 */
export type MaintenanceDocument = {
  _id: NilDid;
  _created: Date;
  _updated: Date;
  window: {
    start: Date;
    end: Date;
  };
};
