import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell-bg">
      <motion.header initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="topbar">
        <h1>{`${user?.tenantName ?? "Tenant"} Intelligence AI`}</h1>
        <div className="topbar-right">
          <span>{user?.email} | {user?.role}</span>
          <button onClick={() => { logout(); navigate("/"); }}>Logout</button>
        </div>
      </motion.header>
      <div className="layout">
        <nav className="sidenav">
          <NavLink to="/app">Dashboard</NavLink>
          <NavLink to="/app/documents">Documents</NavLink>
          <NavLink to="/app/ask">Ask</NavLink>
          {user?.role === "admin" && <NavLink to="/app/users">Users</NavLink>}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}

