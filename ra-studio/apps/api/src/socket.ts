/**
 * Pequeno módulo para compartilhar a instância do Socket.IO entre server.ts e rotas.
 */
import { Server as SocketIOServer } from "socket.io";

export let io: SocketIOServer | null = null;

export function setIo(s: SocketIOServer) {
  io = s;
}
