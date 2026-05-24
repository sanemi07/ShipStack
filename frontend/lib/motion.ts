import type { Variants } from "framer-motion";

// ─── Spring configs ────────────────────────────────────────────
export const springSnappy = { type: "spring", stiffness: 400, damping: 30 };
export const springGentle = { type: "spring", stiffness: 200, damping: 25 };
export const springBouncy = { type: "spring", stiffness: 300, damping: 20 };

// ─── Fade + slide variants ──────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

// ─── Stagger container ──────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// ─── Page transition ────────────────────────────────────────────
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(6px)",
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

// ─── Success burst ───────────────────────────────────────────────
export const successBurst: Variants = {
  hidden: { opacity: 0, scale: 0.4, filter: "blur(20px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

// ─── Letter-by-letter stagger ──────────────────────────────────
export const letterContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.035 },
  },
};

export const letterVariant: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};
