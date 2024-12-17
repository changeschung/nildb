import * as crypto from "node:crypto";
import { bech32 } from "bech32";
import * as didJwt from "did-jwt";
import Elliptic from "elliptic";
import { type NilChainAddress, NilDid } from "#/common/nil-did";

type KeyPair = Elliptic.ec.KeyPair;
// init once for efficiency
const ec = new Elliptic.ec("secp256k1");
// 10 minutes
const DEFAULT_JWT_TTL = 1000 * 60 * 10;

export class Identity {
  private constructor(private keypair: KeyPair) {}

  get publicKey(): string {
    return this.keypair.getPublic(true, "hex");
  }

  get secretKey(): string {
    return this.keypair.getPrivate("hex");
  }

  get address(): NilChainAddress {
    const sha256Hash = crypto
      .createHash("sha256")
      .update(Buffer.from(this.publicKey, "hex"))
      .digest();

    const ripemd160Hash = crypto
      .createHash("ripemd160")
      .update(sha256Hash)
      .digest();

    const prefix = "nillion";
    const address = bech32.encode(prefix, bech32.toWords(ripemd160Hash));
    return address as NilChainAddress;
  }

  get did(): NilDid {
    return process.env.APP_ENV === "mainnet"
      ? NilDid.parse(`did:nil:mainnet:${this.address}`)
      : NilDid.parse(`did:nil:testnet:${this.address}`);
  }

  createJwt(payload: { aud: NilDid }): Promise<string> {
    const signer = didJwt.ES256KSigner(Buffer.from(this.secretKey, "hex"));
    return didJwt.createJWT(payload, {
      signer,
      issuer: this.did,
      expiresIn: DEFAULT_JWT_TTL,
    });
  }

  static fromSk(skAsHex: string): Identity {
    const keys = ec.keyFromPrivate(skAsHex);
    return new Identity(keys);
  }

  static new(): Identity {
    const ec = new Elliptic.ec("secp256k1");
    const keys = ec.genKeyPair();
    return new Identity(keys);
  }

  static isDidFromPublicKey(did: NilDid, publicKeyAsHex: string): boolean {
    const address = did.split(":")[3];

    const sha256Hash = crypto
      .createHash("sha256")
      .update(Buffer.from(publicKeyAsHex, "hex"))
      .digest();

    const ripemd160Hash = crypto
      .createHash("ripemd160")
      .update(sha256Hash)
      .digest();

    const prefix = "nillion";
    const expected = bech32.encode(prefix, bech32.toWords(ripemd160Hash));

    return expected === address;
  }

  static didFromPk(pkAsHex: string): NilDid {
    const sha256Hash = crypto
      .createHash("sha256")
      .update(Buffer.from(pkAsHex, "hex"))
      .digest();

    const ripemd160Hash = crypto
      .createHash("ripemd160")
      .update(sha256Hash)
      .digest();

    const prefix = "nillion";
    const address = bech32.encode(prefix, bech32.toWords(ripemd160Hash));

    return process.env.APP_ENV === "mainnet"
      ? NilDid.parse(`did:nil:mainnet:${address}`)
      : NilDid.parse(`did:nil:testnet:${address}`);
  }
}
