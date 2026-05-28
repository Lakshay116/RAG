import { NextFunction, Request, Response } from "express";
import { UserRole } from "../models/types";
import { getTenantMembership } from "../services/repositories";
import { verifyToken } from "../services/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: "Forbidden" });

    const routeTenantId = req.params.tenantId;
    if (routeTenantId && routeTenantId !== req.auth.tenantId) {
      return res.status(403).json({ error: "Tenant mismatch" });
    }

    if (routeTenantId) {
      const membership = await getTenantMembership(routeTenantId, req.auth.userId);
      if (!membership) return res.status(403).json({ error: "Not a member of this tenant" });
      if (!roles.includes(membership.role)) return res.status(403).json({ error: "Insufficient role" });
    }

    return next();
  };
}
