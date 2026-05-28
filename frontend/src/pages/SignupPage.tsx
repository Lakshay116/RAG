import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function SignupPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api.signup({ tenantName, name, email, password });
      setSession(res.token, res.user);
      navigate("/app");
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Signup</h1>
        <input placeholder="Tenant Name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
        <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Create Tenant & Admin</button>
        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  );
}
