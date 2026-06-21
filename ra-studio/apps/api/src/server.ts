/**
 * Entry point for API server.
 * - Express REST endpoints
 * - Socket.IO for real-time logs/terminal
 * - JWT auth middleware
 *
 * Observações: Este é um scaffold. A execução real de containers deve ocorrer em um runner seguro (não implementado aqui).
 */

import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { json } from "body-parser";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import adminRoutes from "./routes/admin";
import githubRoutes from "./routes/github";
import { setIo } from "./socket"; // <--- importamos setIo

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

setIo(io); // <-- disponibiliza o io para as rotas

const prisma = new PrismaClient();

app.use(cors());
app.use(json());

// Routes
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/admin", adminRoutes);
app.use("/github", githubRoutes);

// Simple health
app.get("/health", (req, res) => res.json({ ok: true }));

// Socket.IO: terminal & logs real-time
io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);

  // Join project room for logs
  socket.on("join-project", (projectId: string) => {
    socket.join(`project_${projectId}`);
  });

  // Terminal input: in a real system, forward to runner container and stream output back
  socket.on("terminal-input", ({ projectId, payload }) => {
    // For scaffold: echo with timestamp
    const msg = `[${new Date().toISOString()}] ECHO: ${payload}`;
    io.to(`project_${projectId}`).emit("terminal-output", msg);
    // Persist a log
    prisma.log.create({
      data: {
        projectId,
        type: "terminal",
        message: msg
      }
    }).catch(console.error);
  });

  socket.on("disconnect", () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT_API ? parseInt(process.env.PORT_API) : 4000;
server.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
