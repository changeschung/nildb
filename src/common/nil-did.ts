import type {
  DIDDocument,
  DIDResolutionOptions,
  DIDResolutionResult,
  Resolvable,
} from "did-resolver";
import { Effect as E, pipe } from "effect";
import { z } from "zod";
import { findAccountByIdWithCache } from "#/common/cache";
import type { RepositoryError } from "#/common/error";
import type { Context } from "#/env";

export const NilDidRegex = /^did:nil:(mainnet|testnet):nillion1[a-z0-9]{38}$/;
export const NilDid = z.custom<NilDid>((data) => NilDidRegex.test(data), {
  message:
    "Invalid NilDid format. Must match did:nil:(mainnet|testnet):nillion1[38 chars]",
});
export type NilDid = MainnetNilDid | TestnetNilDid;
export type NilChainAddress = `nillion1${string}`;
type MainnetNilDid = `did:nil:mainnet:${NilChainAddress}`;
type TestnetNilDid = `did:nil:testnet:${NilChainAddress}`;

export function buildNilMethodResolver(ctx: Context): Resolvable {
  const resolve = async (
    did: string,
    _options?: DIDResolutionOptions,
  ): Promise<DIDResolutionResult> => {
    // only supports application/did+json
    return pipe(findDocument(ctx, did as NilDid), E.runPromise);
  };

  return { resolve };
}

function findDocument(
  ctx: Context,
  did: NilDid,
): E.Effect<DIDResolutionResult, RepositoryError> {
  return pipe(
    findAccountByIdWithCache(ctx, did),
    E.map((account) => ({
      didResolutionMetadata: {
        contentType: "application/did+json",
      },
      didDocument: createDocument(did, account.publicKey),
      didDocumentMetadata: {},
    })),
    E.catchAll((_error) =>
      E.succeed({
        didResolutionMetadata: {
          error: "notFound",
        },
        didDocument: null,
        didDocumentMetadata: {},
      }),
    ),
  );
}

function createDocument(did: string, publicKeyHex: string): DIDDocument {
  return {
    id: did,
    verificationMethod: [
      {
        id: "#secp256k1",
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: did,
        publicKeyHex,
      },
    ],
    authentication: ["#secp256k1"],
  };
}
