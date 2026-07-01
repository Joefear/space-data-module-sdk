/**
 * DER <-> raw conversion for secp256k1 ECDSA signatures.
 *
 * The shared WASM crypto backend (hd-wallet-wasm) produces and consumes
 * raw 64-byte (r || s) signatures. EPM SIGNATURE bytes, however, are
 * ECDSA-DER encoded (SEQUENCE { INTEGER r, INTEGER s }). These helpers
 * bridge the two encodings so the host-crypto ABI can honor the DER
 * contract while calling the raw-signature WASM primitives.
 */

import { toUint8Array } from "./encoding.js";

const RAW_SIGNATURE_LENGTH = 64;
const COMPONENT_LENGTH = 32;

function encodeDerInteger(component) {
  // Strip superfluous leading zero bytes, keeping at least one byte.
  let start = 0;
  while (start < component.length - 1 && component[start] === 0) {
    start += 1;
  }
  let value = component.subarray(start);
  // DER integers are signed; prepend 0x00 when the high bit is set so the
  // value is not interpreted as negative.
  if ((value[0] & 0x80) !== 0) {
    const padded = new Uint8Array(value.length + 1);
    padded.set(value, 1);
    value = padded;
  }
  const encoded = new Uint8Array(value.length + 2);
  encoded[0] = 0x02; // INTEGER
  encoded[1] = value.length;
  encoded.set(value, 2);
  return encoded;
}

/**
 * Encode a raw 64-byte (r || s) secp256k1 ECDSA signature as DER.
 */
export function rawSignatureToDer(rawSignature) {
  const bytes = toUint8Array(rawSignature);
  if (bytes.length !== RAW_SIGNATURE_LENGTH) {
    throw new Error(
      `secp256k1 raw signature must be ${RAW_SIGNATURE_LENGTH} bytes, received ${bytes.length}.`,
    );
  }
  const r = encodeDerInteger(bytes.subarray(0, COMPONENT_LENGTH));
  const s = encodeDerInteger(bytes.subarray(COMPONENT_LENGTH, RAW_SIGNATURE_LENGTH));
  const body = new Uint8Array(r.length + s.length);
  body.set(r, 0);
  body.set(s, r.length);
  // Signature bodies never exceed 127 bytes, so short-form length is safe.
  const der = new Uint8Array(body.length + 2);
  der[0] = 0x30; // SEQUENCE
  der[1] = body.length;
  der.set(body, 2);
  return der;
}

function normalizeComponent(component) {
  let start = 0;
  while (start < component.length - 1 && component[start] === 0) {
    start += 1;
  }
  const value = component.subarray(start);
  if (value.length > COMPONENT_LENGTH) {
    throw new Error("Invalid DER signature: integer component exceeds 32 bytes.");
  }
  const out = new Uint8Array(COMPONENT_LENGTH);
  out.set(value, COMPONENT_LENGTH - value.length);
  return out;
}

function readDerInteger(bytes, offset) {
  if (bytes[offset] !== 0x02) {
    throw new Error("Invalid DER signature: expected INTEGER.");
  }
  const length = bytes[offset + 1];
  const start = offset + 2;
  const end = start + length;
  if (end > bytes.length) {
    throw new Error("Invalid DER signature: INTEGER length exceeds bounds.");
  }
  return { value: bytes.subarray(start, end), next: end };
}

/**
 * Decode a DER-encoded secp256k1 ECDSA signature into raw 64-byte (r || s).
 */
export function derSignatureToRaw(derSignature) {
  const bytes = toUint8Array(derSignature);
  if (bytes.length < 8 || bytes[0] !== 0x30) {
    throw new Error("Invalid DER signature: expected SEQUENCE.");
  }
  let offset = 2;
  if ((bytes[1] & 0x80) !== 0) {
    // Long-form length; skip the length-of-length bytes.
    offset = 2 + (bytes[1] & 0x7f);
  }
  const rPart = readDerInteger(bytes, offset);
  const sPart = readDerInteger(bytes, rPart.next);
  const raw = new Uint8Array(RAW_SIGNATURE_LENGTH);
  raw.set(normalizeComponent(rPart.value), 0);
  raw.set(normalizeComponent(sPart.value), COMPONENT_LENGTH);
  return raw;
}
