/**
 * Prints fresh production secrets for .env / your hosting provider:
 *   node scripts/generate-secrets.mjs
 * CERT_SIGNING_KEY is an Ed25519 private key (base64-encoded PKCS8 PEM). Keep it stable: certificates
 * signed with it stay verifiable only while the same key is configured. Back it up securely.
 */
import { generateKeyPairSync, randomBytes } from "crypto";

const { privateKey } = generateKeyPairSync("ed25519");
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

console.log(`JWT_SECRET=${randomBytes(48).toString("base64url")}`);
console.log(`INTEGRATION_SERVICE_KEY=${randomBytes(32).toString("base64url")}`);
console.log(`CERT_SIGNING_KEY=${Buffer.from(pem).toString("base64")}`);
