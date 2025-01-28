export const PathsV1 = {
  accounts: "/api/v1/accounts",
  admin: {
    root: "/api/v1/admin",
    accounts: {
      root: "/api/v1/admin/accounts",
      subscriptions: "/api/v1/admin/accounts/subscription",
    },
    data: {
      delete: "/api/v1/admin/data/delete",
      flush: "/api/v1/admin/data/flush",
      read: "/api/v1/admin/data/read",
      tail: "/api/v1/admin/data/tail",
      update: "/api/v1/admin/data/update",
      upload: "/api/v1/admin/data/create",
    },
    queries: {
      root: "/api/v1/admin/queries",
      execute: "/api/v1/admin/queries/execute",
    },
    schemas: {
      root: "/api/v1/admin/schemas",
    },
  },
  data: {
    root: "/api/v1/data",
    upload: "/api/v1/data/create",
    read: "/api/v1/data/read",
    update: "/api/v1/data/update",
    delete: "/api/v1/data/delete",
    flush: "/api/v1/data/flush",
    tail: "/api/v1/data/tail",
  },
  docs: "/api/v1/openapi/docs",
  queries: {
    root: "/api/v1/queries",
    execute: "/api/v1/queries/execute",
  },
  schemas: {
    root: "/api/v1/schemas",
  },
  system: {
    about: "/about",
    health: "/health",
  },
} as const;
