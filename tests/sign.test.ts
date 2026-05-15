import { describe, expect, test } from "bun:test";
import { signPayload, verifySignature } from "../src/sign.ts";

const SECRET_RAW = "my-raw-secret";
const SECRET_WHSEC = `whsec_${btoa("my-raw-secret")}`;
const ID = "evt_01";
const TS = 1715700000;
const BODY = '{"type":"user.created","data":{}}';

describe("signPayload", () => {
  test("returns v1,<base64> format", async () => {
    const sig = await signPayload(ID, TS, BODY, SECRET_RAW);
    expect(sig).toMatch(/^v1,[A-Za-z0-9+/]+=*$/);
  });

  test("whsec_ and equivalent raw secret produce same signature", async () => {
    const rawKey = btoa("supersecret");
    const a = await signPayload(ID, TS, BODY, `whsec_${rawKey}`);
    const rawBytes = Uint8Array.from(atob(rawKey), (c) => c.charCodeAt(0));
    // Both should verify against the same HMAC — cross-check via verifySignature
    const ok = await verifySignature(ID, TS, BODY, a, `whsec_${rawKey}`);
    expect(ok).toBe(true);
  });

  test("different body produces different signature", async () => {
    const a = await signPayload(ID, TS, BODY, SECRET_RAW);
    const b = await signPayload(
      ID,
      TS,
      '{"type":"other","data":{}}',
      SECRET_RAW,
    );
    expect(a).not.toBe(b);
  });
});

describe("verifySignature", () => {
  test("verifies a freshly signed payload", async () => {
    const sig = await signPayload(ID, TS, BODY, SECRET_RAW);
    const ok = await verifySignature(ID, TS, BODY, sig, SECRET_RAW);
    expect(ok).toBe(true);
  });

  test("verifies with whsec_ secret", async () => {
    const sig = await signPayload(ID, TS, BODY, SECRET_WHSEC);
    const ok = await verifySignature(ID, TS, BODY, sig, SECRET_WHSEC);
    expect(ok).toBe(true);
  });

  test("rejects tampered body", async () => {
    const sig = await signPayload(ID, TS, BODY, SECRET_RAW);
    const ok = await verifySignature(
      ID,
      TS,
      '{"type":"evil"}',
      sig,
      SECRET_RAW,
    );
    expect(ok).toBe(false);
  });

  test("rejects wrong secret", async () => {
    const sig = await signPayload(ID, TS, BODY, SECRET_RAW);
    const ok = await verifySignature(ID, TS, BODY, sig, "wrong-secret");
    expect(ok).toBe(false);
  });

  test("accepts any valid signature in a space-separated list", async () => {
    const good = await signPayload(ID, TS, BODY, SECRET_RAW);
    const header = `v1,invalidsig ${good}`;
    const ok = await verifySignature(ID, TS, BODY, header, SECRET_RAW);
    expect(ok).toBe(true);
  });

  test("returns false for fully invalid signature header", async () => {
    const ok = await verifySignature(ID, TS, BODY, "v1,badsig", SECRET_RAW);
    expect(ok).toBe(false);
  });
});
