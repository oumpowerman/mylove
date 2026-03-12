import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface BouncyButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
}

export const BouncyButton = ({ children, variant = 'primary', className, ...props }: BouncyButtonProps) => {
  const variants = {
    primary: "bg-emerald-400 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500",
    secondary: "bg-pastel-lavender text-purple-600 shadow-lg shadow-purple-100 hover:bg-purple-100",
    danger: "bg-rose-400 text-white shadow-lg shadow-rose-200 hover:bg-rose-500",
    ghost: "bg-transparent text-stone-500 hover:bg-stone-100",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "px-6 py-3 rounded-2xl font-display text-lg tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
