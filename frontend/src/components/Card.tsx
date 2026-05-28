import { motion } from "framer-motion";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      className="glass-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <h2>{title}</h2>
      {children}
    </motion.section>
  );
}
