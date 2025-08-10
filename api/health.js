// api/health.js — simple ping to test deploy
export default function handler(req, res) {
  res.status(200).json({ ok: true });
}
