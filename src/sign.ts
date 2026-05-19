function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function parseSecret(secret: string): ArrayBuffer {
  if (!secret) {
    throw new Error("Webhook secret cannot be empty");
  }
  if (secret.startsWith("whsec_")) {
    return base64ToArrayBuffer(secret.slice(6));
  }
  return new TextEncoder().encode(secret).buffer as ArrayBuffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    parseSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSignature(
  secret: string,
  content: string,
): Promise<string> {
  const key = await getKey(secret);
  const encoded = new TextEncoder().encode(content);
  const signature = await crypto.subtle.sign("HMAC", key, encoded);
  return `v1,${arrayBufferToBase64(signature)}`;
}

export async function verifySignature(
  secret: string,
  content: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await getKey(secret);
    const encoded = new TextEncoder().encode(content);

    const sigPart = signature.startsWith("v1,")
      ? signature.slice(3)
      : signature;
    const sigBytes = base64ToArrayBuffer(sigPart);

    return crypto.subtle.verify("HMAC", key, sigBytes, encoded);
  } catch {
    return false;
  }
}
