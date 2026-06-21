/**
 * GitHub integration skeleton.
 * - /github/oauth -> redirect to GitHub OAuth (to implement)
 * - /github/webhook -> webhook receiver (verify signature)
 *
 * Note: Implement real OAuth and secret verification in production.
 */

import express from "express";
const router = express.Router();

router.post("/webhook", express.json(), (req, res) => {
  // TODO: validate signature
  const event = req.headers["x-github-event"];
  // Process push -> trigger deploy if repo linked
  console.log("GH webhook event:", event);
  res.json({ ok: true });
});

export default router;
