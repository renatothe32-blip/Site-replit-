/**
 * Runner service:
 * - Recebe POST /run { projectId }
 * - Busca projeto/arquivos da API (rota runner protegida por RUNNER_SECRET)
 * - Cria container a partir de node:20-alpine
 * - Copia arquivos para /workspace do container via putArchive (tar)
 * - Exec 'npm install' (se houver package.json) e 'npm run start' ou 'node index.js'
 * - Stream logs e POST para API /projects/:id/logs (x-runner-secret)
 *
 * Segurança:
 * - Usa RUNNER_SECRET para autenticar-se à API.
 * - No docker-compose estamos montando /var/run/docker.sock (não é ideal em produção).
 * - Em produção prefira um runner host/VM com isolamento, ou Kubernetes com CRI.
 */

import express from "express";
import dotenv from "dotenv";
import Docker from "dockerode";
import axios from "axios";
import tar from "tar-stream";
import stream from "stream";
import { Readable } from "stream";

dotenv.config();

const app = express();
app.use(express.json());

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const RUNNER_SECRET = process.env.RUNNER_SECRET || "please_change_runner_secret";
const API_URL = process.env.RUNNER_API_URL || "http://api:4000";
const PORT = process.env.RUNNER_PORT ? parseInt(process.env.RUNNER_PORT) : 5000;

/**
 * Map jobId -> container
 */
const jobs: Record<string, Docker.Container> = {};

/**
 * Helper: create tar stream from project files
 */
function filesToTarStream(files: { path: string; content: string }[]) {
  const pack = tar.pack();
  for (const f of files) {
    // Ensure directories in path are created implicitly by tar
    pack.entry({ name: f.path }, f.content);
  }
  pack.finalize();
  return pack as unknown as stream.Readable;
}

/**
 * POST /run
 * body: { projectId: string, cpuLimitMillicores?: number, memMB?: number }
 */
app.post("/run", async (req, res) => {
  try {
    const secret = req.headers["x-runner-secret"];
    if (!secret || secret !== RUNNER_SECRET) return res.status(401).json({ error: "unauthorized" });

    const { projectId, cpuLimitMillicores, memMB } = req.body;
    if (!projectId) return res.status(400).json({ error: "missing projectId" });

    // Fetch project and files from API
    const projectResp = await axios.get(`${API_URL}/projects/runner/project/${projectId}`, {
      headers: { "x-runner-secret": RUNNER_SECRET },
      timeout: 20000
    });
    const project = projectResp.data;
    const files: { path: string; content: string }[] = project.files || [];

    // Create container
    const image = "node:20-alpine";
    // Pull image if not present
    await new Promise<void>((resolve, reject) => {
      docker.pull(image, {}, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2: any) => (err2 ? reject(err2) : resolve()));
      });
    });

    // HostConfig: set basic resource limits if provided
    const hostConfig: Docker.ContainerCreateOptions["HostConfig"] = {};
    if (memMB) {
      hostConfig.Memory = memMB * 1024 * 1024; // bytes
    }
    if (cpuLimitMillicores) {
      // Docker cpuQuota/cpuPeriod approach
      const cpuPeriod = 100000;
      hostConfig.CpuPeriod = cpuPeriod;
      hostConfig.CpuQuota = Math.round((cpuLimitMillicores / 1000) * cpuPeriod);
    }

    const container = await docker.createContainer({
      Image: image,
      Tty: false,
      Cmd: ["/bin/sh", "-c", "sleep infinity"],
      HostConfig: {
        ...hostConfig,
        AutoRemove: true
      }
    });

    // Start container
    await container.start();

    // Copy files into /workspace
    const packStream = filesToTarStream(files);
    // Dockerode expects a tar buffer/stream
    // putArchive requires a tar stream and destination path inside container
    await container.putArchive(packStream as any, { path: "/workspace" });

    // Install deps if package.json exists
    // Execute commands: cd /workspace && if [ -f package.json ]; then npm install --production; fi
    const installCmd = `cd /workspace && if [ -f package.json ]; then npm install --production; fi`;
    const startCmd = `cd /workspace && if [ -f package.json ]; then (npm run start || node index.js); else node index.js; fi`;

    // Exec install
    const execInstall = await container.exec({
      Cmd: ["/bin/sh", "-lc", installCmd],
      AttachStdout: true,
      AttachStderr: true
    });
    const installStream = await execInstall.start({ hijack: true, stdin: false });
    // Wait for install to finish (collect but do not block forever)
    await new Promise<void>((resolve) => {
      installStream.on("end", () => resolve());
      // Some streams may not emit end; set small timeout guard
      setTimeout(resolve, 30_000);
    }).catch(() => {});

    // Exec start (detached)
    const execStart = await container.exec({
      Cmd: ["/bin/sh", "-lc", startCmd],
      AttachStdout: true,
      AttachStderr: true,
      Detach: false
    });
    const startStream = await execStart.start({ hijack: true, stdin: false });

    // Stream logs from container (attach)
    const logStream = await container.attach({ stream: true, stdout: true, stderr: true });
    logStream.on("data", async (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      // Send to API logs endpoint
      try {
        await axios.post(
          `${API_URL}/projects/${projectId}/logs`,
          { type: "runner", message: text },
          { headers: { "x-runner-secret": RUNNER_SECRET }, timeout: 5000 }
        );
      } catch (e) {
        console.error("failed to send log to api", e);
      }
    });

    // Save job
    const jobId = container.id;
    jobs[jobId] = container;

    res.json({ ok: true, jobId, containerId: container.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "runner error", details: err instanceof Error ? err.message : String(err) });
  }
});

/* Stop job */
app.post("/stop", async (req, res) => {
  try {
    const secret = req.headers["x-runner-secret"];
    if (!secret || secret !== RUNNER_SECRET) return res.status(401).json({ error: "unauthorized" });

    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: "missing jobId" });

    const container = jobs[jobId];
    if (!container) return res.status(404).json({ error: "job not found" });

    try {
      await container.kill();
    } catch (e) {
      console.warn("kill failed", e);
    }
    delete jobs[jobId];
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Runner listening on ${PORT}`);
});
