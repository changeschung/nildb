type ErrorOptions = {
  reason: string | string[];
  cause?: unknown;
  context?: Record<string, unknown>;
};

export abstract class AppError extends Error {
  public reason: Set<string>;
  public code?: number;
  public cause?: unknown;
  public context?: Record<string, unknown>;

  protected constructor(
    readonly _tag: `${string}Error`,
    options: ErrorOptions,
  ) {
    super(_tag);
    this.name = this.constructor.name;

    this.reason = new Set([
      _tag,
      ...(Array.isArray(options.reason) ? options.reason : [options.reason]),
    ]);

    if (options.cause && options.cause instanceof AppError) {
      for (const reason of options.cause.reason) this.reason.add(reason);
    }

    this.cause = options.cause;
    this.context = options.context;

    Error.captureStackTrace(this, this.constructor);
  }

  withContext(context: Record<string, unknown>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  toJSON() {
    return {
      tag: this._tag,
      reason: Array.from(this.reason),
      cause: this.cause,
      context: this.context,
      stack: this.stack?.split("\n").map((line) => line.trim()),
    };
  }
}

export class RepositoryError extends AppError {
  static readonly _tag = "RepositoryError";

  constructor(options: ErrorOptions) {
    super("RepositoryError", options);
  }
}

export class ServiceError extends AppError {
  static readonly _tag = "ServiceError";

  constructor(options: ErrorOptions) {
    super("ServiceError", options);
  }
}

export class ControllerError extends AppError {
  static readonly _tag = "ControllerError";

  constructor(options: ErrorOptions) {
    super("ControllerError", options);
  }
}

export class ResourceAuthorizationError extends AppError {
  static readonly _tag = "ResourceAuthorizationError";

  constructor(options: ErrorOptions) {
    super("ResourceAuthorizationError", options);
  }
}

export class DataValidationError extends AppError {
  static readonly _tag = "DataValidationError";

  constructor(options: ErrorOptions) {
    super("DataValidationError", options);
  }
}
