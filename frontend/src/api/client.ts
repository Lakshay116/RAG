import { SessionUser } from "../auth/roles";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

interface DocumentItem {
  id: string;
  tenantId: string;
  fileName: string;
  rawText: string;
  createdAt: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function headers(token?: string): Record<string, string> {
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
}

export const api = {
  signup: (payload: { tenantName: string; name: string; email: string; password: string }) =>
    fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    }).then((r) => parseJson<{ token: string; user: SessionUser }>(r)),

  login: (payload: { email: string; password: string }) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    }).then((r) => parseJson<{ token: string; user: SessionUser }>(r)),

  listDocuments: (tenantId: string, token: string) =>
    fetch(`${API_BASE}/tenant/${tenantId}/documents`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
      parseJson<{ tenantId: string; documents: DocumentItem[] }>(r)
    ),

  uploadDocument: (tenantId: string, token: string, payload: { fileName: string; content: string }) =>
    fetch(`${API_BASE}/tenant/${tenantId}/documents`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload)
    }).then((r) => parseJson<unknown>(r)),

  uploadPdfDocument: (tenantId: string, token: string, file: File, fileName?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (fileName?.trim()) {
      formData.append("fileName", fileName.trim());
    }

    return fetch(`${API_BASE}/tenant/${tenantId}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then((r) => parseJson<unknown>(r));
  },

  deleteDocument: (tenantId: string, token: string, documentId: string) =>
    fetch(`${API_BASE}/tenant/${tenantId}/documents/${documentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => parseJson<void>(r)),

  query: (tenantId: string, token: string, query: string) =>
    fetch(`${API_BASE}/tenant/${tenantId}/query`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ query })
    }).then((r) => parseJson<{ answer: string; confidence: number; warning?: string }>(r)),

  listUsers: (tenantId: string, token: string) =>
    fetch(`${API_BASE}/tenant/${tenantId}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => parseJson<{ users: Array<{ id: string; name: string; email: string; role: string }> }>(r)),

  createUser: (
    tenantId: string,
    token: string,
    payload: { name: string; email: string; password: string; role: "admin" | "editor" | "viewer" }
  ) =>
    fetch(`${API_BASE}/tenant/${tenantId}/users`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload)
    }).then((r) => parseJson<{ ok: true }>(r))
};
