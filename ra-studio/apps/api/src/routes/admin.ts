/**
 * Admin routes scaffold
 * - Protected by role check (simple)
 */
import express from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);
router.get("/stats", async (req: AuthRequest, res) => {
  // Check role (in real life, fetch user)
  // Placeholder: return general stats
  const users = await prisma.user.count();
  const projects = await prisma.project.count();
  res.json({ users, projects });
});

export default router;
