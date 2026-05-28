import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="login-wrap">
      <motion.div className="login-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1>Multi-Tenant RAG Platform</h1>
        <p>Secure tenant-isolated knowledge app with role-based access.</p>
        <div className="row">
          <Link to="/login" className="btn-link">Login</Link>
          <Link to="/signup" className="btn-link ghost">Signup</Link>
        </div>
      </motion.div>
    </div>
  );
}
