import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export type AuthenticatedRequest = Request & { userId: string };

export function authenticatedUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).userId;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  next();
}