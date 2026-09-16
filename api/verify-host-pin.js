// /api/verify-host-pin.js
//
// The browser sends a guess; this compares it against the real PIN,
// which lives only as a server-side environment variable, and replies
// with true or false — never the actual value. This replaces the old
// design, where the correct PIN sat in plain text in the page's own
// source code, readable by anyone who opened the browser's dev tools.
//
// Env var to set in Vercel:
//   HOST_PIN — pick something stronger than a 4-digit number if you
//   can. A short numeric PIN is still guessable by brute force even
//   though the correct value itself is no longer sitting in the page —
//   an attacker can just try all 10,000 four-digit combinations against
//   this endpoint directly. A longer PIN, or a PIN plus a short delay/
//   lockout after repeated wrong guesses, closes that gap; this
//   function doesn't rate-limit attempts on its own.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { pin } = req.body || {};
  const correctPin = process.env.HOST_PIN;

  if (!correctPin) {
    res.status(500).json({ error: "HOST_PIN is not configured on the server" });
    return;
  }

  const valid = typeof pin === "string" && pin.length === correctPin.length && timingSafeEqual(pin, correctPin);
  res.status(200).json({ valid });
};

// A plain === comparison exits as soon as it finds a mismatched
// character, which in principle leaks a tiny timing signal about how
// many characters were guessed correctly. Low-stakes for a family app's
// host PIN, but a constant-time comparison is nearly free to include,
// so there's no reason not to.
function timingSafeEqual(a, b) {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
