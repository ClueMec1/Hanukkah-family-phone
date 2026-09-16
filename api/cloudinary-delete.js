// /api/cloudinary-delete.js
//
// Deleting a Cloudinary asset requires a signature computed from that
// account's API secret — a secret that can never sit in browser code.
// This function holds each Cloudinary account's key/secret as a server-
// side environment variable and performs the actual signed delete
// itself. The browser only ever sends which file to delete, never a
// secret of any kind — this replaces the earlier design where the host
// had to paste the secret into the app itself for every cleanup run.
//
// Env var to set in Vercel:
//   CLOUDINARY_ACCOUNTS  — a JSON object mapping each cloud name to its
//   own key/secret, e.g.:
//   {"your-cloud-name":{"apiKey":"123456789012345","apiSecret":"abcDEF..."},
//    "second-cloud-name":{"apiKey":"...","apiSecret":"..."}}
//   Add one entry per Cloudinary account configured in Host → Integrations.

const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { cloudName, publicId, resourceType } = req.body || {};
  if (!cloudName || !publicId) {
    res.status(400).json({ error: "Missing cloudName or publicId" });
    return;
  }

  let accounts;
  try {
    accounts = JSON.parse(process.env.CLOUDINARY_ACCOUNTS || "{}");
  } catch (e) {
    res.status(500).json({ error: "CLOUDINARY_ACCOUNTS environment variable is not valid JSON" });
    return;
  }

  const account = accounts[cloudName];
  if (!account || !account.apiKey || !account.apiSecret) {
    res.status(400).json({ error: `No server-side credentials configured for cloud "${cloudName}"` });
    return;
  }

  try {
    const result = await cloudinaryDestroy(cloudName, account.apiKey, account.apiSecret, publicId, resourceType);
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};

// Signing scheme verified directly against Cloudinary's own documented
// examples: parameters sorted alphabetically by key, joined as
// key=value&key=value, with the secret appended directly (not as a
// separate parameter) before hashing with SHA1.
async function cloudinaryDestroy(cloudName, apiKey, apiSecret, publicId, resourceType) {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(stringToSign + apiSecret).digest("hex");

  const form = new URLSearchParams();
  form.append("public_id", publicId);
  form.append("timestamp", String(timestamp));
  form.append("api_key", apiKey);
  form.append("signature", signature);

  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType || "image"}/destroy`, {
    method: "POST",
    body: form
  });
  const data = await r.json().catch(() => ({}));
  const ok = data.result === "ok" || data.result === "not found"; // "not found" = already gone — treat as done
  return { ok, result: data.result || null };
}
