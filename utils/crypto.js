const crypto = require('crypto');

// AES-256-GCM encrypt/decrypt for sensitive payment tokens.
// Requires PAYMENT_ENC_KEY as a 32-byte key in base64 or hex.
function getKey() {
  const raw = process.env.PAYMENT_ENC_KEY || '';
  if (!raw) throw new Error('PAYMENT_ENC_KEY not set');
  // Try base64 then hex; else use utf8 (not recommended but avoids crash in dev)
  let key;
  try {
    key = Buffer.from(raw, 'base64');
  } catch (_) {}
  if (!key || key.length !== 32) {
    const hex = Buffer.from(raw, 'hex');
    if (hex.length === 32) key = hex;
  }
  if (!key || key.length !== 32) {
    // fallback: pad/truncate utf8 to 32 bytes in dev
    const utf = Buffer.from(raw, 'utf8');
    key = Buffer.alloc(32);
    utf.copy(key, 0, 0, Math.min(utf.length, 32));
  }
  if (key.length !== 32) throw new Error('PAYMENT_ENC_KEY must be 32 bytes');
  return key;
}

function encrypt(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
  const key = getKey();
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
