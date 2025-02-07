import type { MongoError } from "mongodb";
import type { JsonObject } from "type-fest";
import type { NilDid } from "#/common/nil-did";

export class DuplicateEntryError {
  readonly _tag = "DuplicateEntryError";
  constructor(readonly document: JsonObject) {}

  toString(): string {
    return `${this._tag}(document=${JSON.stringify(this.document)})`;
  }
}

export class ResourceAccessDeniedError {
  readonly _tag = "ResourceAccessDeniedError";
  constructor(
    readonly type: string,
    readonly id: string,
    readonly user: NilDid,
  ) {}

  toString(): string {
    return `${this._tag}(type=${this.type},id=${this.id},user=${this.user})`;
  }
}

export class InvalidIndexOptionsError {
  readonly _tag = "InvalidIndexOptionsError";
  constructor(
    readonly collection: string,
    readonly message: string,
  ) {}

  toString(): string {
    return `${this._tag}(message=${this.message})`;
  }
}

export class IndexNotFoundError {
  readonly _tag = "IndexNotFoundError";
  constructor(
    readonly collection: string,
    readonly index: string,
  ) {}

  toString(): string {
    return `${this._tag}(collection=${this.collection},index=${this.index})`;
  }
}

export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly error: MongoError) {}

  toString(): string {
    return `${this._tag}(message=${this.error.message})`;
  }
}

export class DocumentNotFoundError {
  readonly _tag = "DocumentNotFoundError";
  constructor(
    readonly collection: string,
    readonly filter: Record<string, unknown>,
  ) {}

  toString(): string {
    return `${this._tag}(collection=${this.collection},filter=${this.filter})`;
  }
}

export class PrimaryCollectionNotFoundError {
  readonly _tag = "PrimaryCollectionNotFoundError";
  constructor(readonly name: string) {}

  toString(): string {
    return `${this._tag}(name=${this.name})`;
  }
}

export class DataCollectionNotFoundError {
  readonly _tag = "DataCollectionNotFoundError";
  constructor(readonly name: string) {}

  toString(): string {
    return `${this._tag}(name=${this.name})`;
  }
}

export class DataValidationError {
  readonly _tag = "DataValidationError";
  constructor(
    readonly issues: string[],
    readonly cause: unknown,
  ) {}

  toString(): string {
    return `${this._tag}(issues=${this.issues},cause=${JSON.stringify(this.cause)})`;
  }
}

export class VariableInjectionError {
  readonly _tag = "VariableInjectionError";
  constructor(readonly message: string) {}

  toString(): string {
    return `${this._tag}(message=${this.message})`;
  }
}
