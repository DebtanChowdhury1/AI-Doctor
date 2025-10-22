"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function AnimatedDoctor() {
  return (
    <motion.div
      className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/70 shadow-2xl"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <Image src="/doctor-avatar.svg" alt="AI Doctor" fill className="object-cover" />
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-brand/40 via-transparent to-success/30"
        animate={{ rotate: [0, 360] }}
        transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
      />
    </motion.div>
  );
}
