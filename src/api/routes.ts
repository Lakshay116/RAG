import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { answerQuery, ingestDocument } from "../rag/ragService";
import { detectPromptInjection, safeFallback } from "../rag/guardrails";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { extractTextFromPdf } from "../services/pdf";
import { hashPassword, signToken, verifyPassword } from "../services/auth";
import {
  addUserToTenant,
  createTenant,
  createUser,
  deleteDocumentByTenant,
  getTenant,
  getTenantMembership,
  getUserByEmail,
  listDocumentsByTenant,
  listTenantMembershipsByUser,
  listTenantUsers,
  saveDocument
} from "../services/repositories";

const signupSchema = z.object({
  tenantName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const createTenantUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "editor", "viewer"])
});

const uploadDocumentSchema = z.object({
  fileName: z.string().min(1),
  content: z.string().min(1)
});

const querySchema = z.object({
  query: z.string().min(2)
});

export const apiRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.post(
  "/auth/signup",
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await getUserByEmail(parsed.data.email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const tenant = await createTenant({
      id: uuidv4(),
      name: parsed.data.tenantName,
      createdAt: new Date().toISOString()
    });

    const user = await createUser({
      id: uuidv4(),
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      createdAt: new Date().toISOString()
    });

    await addUserToTenant(tenant.id, user.id, "admin");

    const token = signToken({ sub: user.id, email: user.email, tenantId: tenant.id, role: "admin" });
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "admin",
        tenantId: tenant.id,
        tenantName: tenant.name
      },
      tenant
    });
  })
);

apiRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const user = await getUserByEmail(parsed.data.email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const memberships = await listTenantMembershipsByUser(user.id);
    if (!memberships.length) return res.status(403).json({ error: "User has no tenant membership" });

    const current = memberships[0];
    const tenant = await getTenant(current.tenantId);
    const token = signToken({ sub: user.id, email: user.email, tenantId: current.tenantId, role: current.role });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: current.role,
        tenantId: current.tenantId,
        tenantName: tenant?.name ?? "Tenant"
      }
    });
  })
);

apiRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const membership = await getTenantMembership(req.auth!.tenantId, req.auth!.userId);
    if (!membership) return res.status(403).json({ error: "Membership not found" });
    return res.json({ user: req.auth });
  })
);

apiRouter.post(
  "/tenant/:tenantId/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const parsed = createTenantUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const normalizedEmail = parsed.data.email.toLowerCase();
    const existingUser = await getUserByEmail(normalizedEmail);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const newUser = await createUser({
        id: uuidv4(),
        email: normalizedEmail,
        name: parsed.data.name,
        passwordHash: await hashPassword(parsed.data.password),
        createdAt: new Date().toISOString()
      });
      userId = newUser.id;
    }

    await addUserToTenant(req.params.tenantId, userId, parsed.data.role);
    return res.status(201).json({ ok: true });
  })
);

apiRouter.get(
  "/tenant/:tenantId/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const users = await listTenantUsers(req.params.tenantId);
    return res.json({ users });
  })
);

apiRouter.post(
  "/tenant/:tenantId/documents",
  requireAuth,
  requireRole(["admin", "editor"]),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    let fileName = "";
    let content = "";

    if (req.file) {
      const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return res.status(400).json({ error: "Only PDF files are allowed in multipart upload." });
      }
      fileName = req.body.fileName || req.file.originalname;
      content = await extractTextFromPdf(req.file.buffer);
      if (!content) {
        return res.status(400).json({ error: "Could not extract text from PDF." });
      }
    } else {
      const parsed = uploadDocumentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      fileName = parsed.data.fileName;
      content = parsed.data.content;
    }

    const document = await saveDocument({
      id: uuidv4(),
      tenantId: tenant.id,
      fileName,
      rawText: content,
      createdAt: new Date().toISOString()
    });

    const ingestion = await ingestDocument(tenant.id, document.id, document.rawText);
    return res.status(201).json({ document, ingestion });
  })
);

apiRouter.get(
  "/tenant/:tenantId/documents",
  requireAuth,
  requireRole(["admin", "editor", "viewer"]),
  asyncHandler(async (req, res) => {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    return res.json({
      tenantId: tenant.id,
      documents: await listDocumentsByTenant(tenant.id)
    });
  })
);

apiRouter.delete(
  "/tenant/:tenantId/documents/:documentId",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const deleted = await deleteDocumentByTenant(tenant.id, req.params.documentId);
    if (!deleted) return res.status(404).json({ error: "Document not found for this tenant" });

    return res.status(204).send();
  })
);

apiRouter.post(
  "/tenant/:tenantId/query",
  requireAuth,
  requireRole(["admin", "editor", "viewer"]),
  asyncHandler(async (req, res) => {
    const tenant = await getTenant(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const query = parsed.data.query;
    if (detectPromptInjection(query)) {
      return res.status(200).json(safeFallback("Unsafe query detected. Please ask a normal knowledge question."));
    }
    const answer = await answerQuery(tenant.id, query);
    return res.json(answer);
  })
);

