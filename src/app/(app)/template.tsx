"use client";

import { motion } from "motion/react";

/** Transição entre telas: sutil, rápida e desativada quando o sistema pede menos movimento. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}>
      {children}
    </motion.div>
  );
}
