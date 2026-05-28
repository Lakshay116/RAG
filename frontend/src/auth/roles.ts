export type Role = "admin" | "editor" | "viewer";

export interface SessionUser {
  id: string;
  email: string;
  tenantId: string;
  tenantName?: string;
  role: Role;
  name?: string;
}

export const roleCapabilities: Record<Role, string[]> = {
  admin: ["users:manage", "documents:view", "documents:upload", "documents:delete", "query:run"],
  editor: ["documents:view", "documents:upload", "query:run"],
  viewer: ["documents:view", "query:run"]
};

