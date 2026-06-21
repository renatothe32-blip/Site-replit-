/**
 * Project routes:
 * - GET /projects -> list user's projects
 * - POST /projects -> create
 * - GET /projects/:id -> details + files
 * - POST /projects/:id/files -> create/update file
 * - DELETE /projects/:id -> remove
 *
 * Novo:
 * - GET /runner/project/:id -> usado pelo runner (header x-runner-secret)
 * - POST /projects/:id/logs -> usado pelo runner para enviar logs (header x-runner-secret)
 *
 * Notes:
 * - Files are stored in DB for simplicity (File.content).
 * - For production, use object storage for large files and a proper runner.
 */

import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, AuthRequest } from "../middleware/auth";
import slugify from "slugify";
import dotenv from "dotenv";
import { io } from "../socket";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

const RUNNER_SECRET = process.env.RUNNER_SECRET || "please_change_runner_secret";

/* List projects for user */
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const projects = await prisma.project.findMany({ where: { ownerId: userId } });
  res.json(projects);
});

/* Create project */
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, description, templateId } = req.body;
  const slug = slugify(name || "project", { lower: true }) + "-" + Math.random().toString(36).slice(2, 8);

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      description,
      ownerId: userId
    }
  });

  // If template provided, clone template files (placeholder)
  if (templateId) {
    // TODO: copy template files
  }
  res.json(project);
});

/* Get project with files */
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = req.params.id;
  const project = await prisma.project.findFirst({
    where: { id, ownerId: userId },
    include: { files: true }
  });
  if (!project) return res.status(404).json({ error: "not found" });
  res.json(project);
});

/* Create or update file */
router.post("/:id/files", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const projectId = req.params.id;
  const { path, content } = req.body;
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: userId } });
  if (!project) return res.status(404).json({ error: "project not found" });

  // Upsert file by path
  const existing = await prisma.file.findFirst({ where: { projectId, path } });
  if (existing) {
    const updated = await prisma.file.update({ where: { id: existing.id }, data: { content } });
    res.json(updated);
  } else {
    const created = await prisma.file.create({ data: { projectId, path, content } });
    res.json(created);
  }
});

/* Delete project */
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const projectId = req.params.id;
  // Cascade: delete files first
  await prisma.file.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId, ownerId: userId } });
  res.json({ ok: true });
});

/* Runner: get project files (trusted runner using RUNNER_SECRET) */
router.get("/runner/project/:id", async (req, res) => {
  const secret = req.headers["x-runner-secret"];
  if (!secret || secret !== RUNNER_SECRET) return res.status(401).json({ error: "unauthorized" });

  const projectId = req.params.id;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: true }
  });
  if (!project) return res.status(404).json({ error: "not found" });

  // Return project + files to runner
  res.json(project);
});

/* Runner: receive logs from runner and emit via socket.io */
router.post("/:id/logs", express.json(), async (req, res) => {
  const secret = req.headers["x-runner-secret"];
  if (!secret || secret !== RUNNER_SECRET) return res.status(401).json({ error: "unauthorized" });

  const projectId = req.params.id;
  const { type, message } = req.body;
  try {
    const log = await prisma.log.create({
      data: {
        projectId,
        type: type || "runner",
        message: message || ""
      }
    });

    // Emit via Socket.IO to project room
    try {
      io?.to(`project_${projectId}`).emit("terminal-output", message);
    } catch (e) {
      console.error("socket emit error", e);
    }

    res.json({ ok: true, id: log.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

export default router;
