import { createHash } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "bech32";
import { Command } from "commander";

function getPrivateKey(providedKey: string | null): Uint8Array {
  if (!providedKey) {
    return secp256k1.utils.randomPrivateKey();
  }
  const decoded = Buffer.from(providedKey, "base64");
  if (decoded.length !== 32 || !secp256k1.utils.isValidPrivateKey(decoded)) {
    throw new Error("Invalid private key");
  }
  return decoded;
}

type Args = { privateKey: string };

function main() {
  const program = new Command();

  program
    .name("key-generator")
    .description("Generate or derive secp256k1 keys and addresses")
    .option("--private-key <key>", "provide a private key in base64")
    .version("0.0.1");

  program.parse(process.argv);
  const options = program.opts<Args>();

  const privKey = getPrivateKey(options.privateKey);
  const pubKey = secp256k1.getPublicKey(privKey);

  const sha256Hash = createHash("sha256").update(pubKey).digest();
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  const prefix = "nillion1";
  const address = bech32.encode(prefix, bech32.toWords(ripemd160Hash));

  const privKeyBase64 = Buffer.from(privKey).toString("base64");
  const pubKeyBase64 = Buffer.from(pubKey).toString("base64");
  const sha256HashBase64 = Buffer.from(sha256Hash).toString("base64");
  const ripemd160HashBase64 = Buffer.from(ripemd160Hash).toString("base64");

  console.table({
    "Private Key": {
      Value: privKeyBase64,
      Length: privKey.length,
    },
    "Public Key": {
      Value: pubKeyBase64,
      Length: pubKey.length,
    },
    "SHA256 Hash": {
      Value: sha256HashBase64,
      Length: sha256Hash.length,
    },
    "RIPEMD160 Hash": {
      Value: ripemd160HashBase64,
      Length: ripemd160Hash.length,
    },
    Address: {
      Value: address,
      Length: address.length,
    },
  });
}

main();
