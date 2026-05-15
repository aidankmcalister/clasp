async function importKey(secret: string): Promise<CryptoKey> {
  const raw = secret.startsWith("whsec_")
    ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(secret);

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(
  webhookId: string,
  timestamp: number,
  body: string,
  secret: string,
): Promise<string> {
  const key = await importKey(secret);
  const msg = new TextEncoder().encode(`${webhookId}.${timestamp}.${body}`);
  const buf = await crypto.subtle.sign("HMAC", key, msg);
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
}

export async function verifySignature(
  webhookId: string,
  timestamp: number,
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const key = await importKey(secret);
  const msg = new TextEncoder().encode(`${webhookId}.${timestamp}.${body}`);

  for (const token of signatureHeader.split(" ")) {
    const b64 = token.startsWith("v1,") ? token.slice(3) : null;
    if (!b64) continue;

    try {
      const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ok = await crypto.subtle.verify("HMAC", key, sigBytes, msg);
      if (ok) return true;
    } catch {
      // malformed base64 — skip
    }
  }

  return false;
}
