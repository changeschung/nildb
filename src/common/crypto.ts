import { createHash } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "bech32";

export class Identity {
  private pk: Uint8Array;

  private constructor(private sk: Uint8Array) {
    this.pk = secp256k1.getPublicKey(this.sk, true);
  }

  get publicKeyAsBase64(): string {
    return Buffer.from(this.pk).toString("base64");
  }

  get publicKeyAsHex(): string {
    return Buffer.from(this.pk).toString("base64");
  }

  get address(): string {
    const sha256Hash = createHash("sha256").update(this.pk).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    const prefix = "nillion1";
    const address = bech32.encode(prefix, bech32.toWords(ripemd160Hash));
    return address;
  }

  static fromSk(sk: Uint8Array): Identity {
    return new Identity(sk);
  }

  static fromBase64(sk: string): Identity {
    const bytes = Uint8Array.from(Buffer.from(sk, "base64"));
    return new Identity(bytes);
  }

  static new(): Identity {
    const bytes = secp256k1.utils.randomPrivateKey();
    return new Identity(bytes);
  }
}
