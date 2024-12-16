type ErrorOptions = {
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
};

export abstract class AppError extends Error {
  public cause?: unknown;
  public context?: Record<string, unknown>;

  protected constructor(
    readonly _tag: `${string}Error`,
    options: ErrorOptions,
  ) {
    super(options.message);
    this.name = this.constructor.name;
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
      message: this.message,
      cause: this.cause,
      context: this.context,
      stack: this.stack?.split("\n").map((line) => line.trim()),
    };
  }
}

export class RepositoryError extends AppError {
  constructor(options: ErrorOptions) {
    super("RepositoryError", options);
  }
}

export class ServiceError extends AppError {
  constructor(options: ErrorOptions) {
    super("ServiceError", options);
  }
}

export class ControllerError extends AppError {
  constructor(options: ErrorOptions) {
    super("ControllerError", options);
  }
}
