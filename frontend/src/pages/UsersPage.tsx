import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";

export function UsersPage() {
  const { user, token, can } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    if (!can("users:manage")) return;
    try {
      const res = await api.listUsers(user!.tenantId, token!);
      setUsers(res.users);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.createUser(user!.tenantId, token!, { name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      setMessage("User added to tenant");
      await loadUsers();
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  if (!can("users:manage")) {
    return <Card title="Users"><p>Only admin can manage users.</p></Card>;
  }

  return (
    <div className="stack">
      <Card title="Tenant Users">
        <div className="list">
          {users.map((u) => (
            <div className="list-item" key={u.id}>
              <div><b>{u.name}</b><p>{u.email}</p></div>
              <span>{u.role}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Add User (Admin)">
        <form className="stack" onSubmit={onSubmit}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "editor" | "viewer") }>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit">Add User</button>
        </form>
        {message && <p className="notice">{message}</p>}
      </Card>
    </div>
  );
}
