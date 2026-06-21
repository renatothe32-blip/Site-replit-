/**
 * JWT middleware - adiciona req.userId se token válido.
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "please-change-this";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "no auth" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "malformed auth header" });
  const token = parts[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
}
