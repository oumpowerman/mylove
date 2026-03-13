import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { BouncyButton } from './BouncyButton';
import { AlertCircle, X } from 'lucide-react';

interface DialogGlobalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export const DialogGlobal = ({
  isOpen,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  variant = 'info'
}: DialogGlobalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm relative"
          >
            <GlassCard className="p-8 border-none shadow-2xl overflow-hidden">
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${
                  variant === 'danger' ? 'bg-rose-50 text-rose-400' : 'bg-emerald-50 text-emerald-400'
                }`}>
                  <AlertCircle className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-display text-stone-800 mb-2">{title}</h3>
                <p className="text-stone-500 font-sans text-sm mb-8 leading-relaxed">
                  {description}
                </p>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <BouncyButton
                    variant="ghost"
                    onClick={onCancel}
                    className="py-4 rounded-2xl bg-stone-100 text-stone-500 hover:bg-stone-200"
                  >
                    {cancelLabel}
                  </BouncyButton>
                  <BouncyButton
                    onClick={onConfirm}
                    className={`py-4 rounded-2xl text-white shadow-lg ${
                      variant === 'danger' ? 'bg-rose-400 shadow-rose-100' : 'bg-emerald-400 shadow-emerald-100'
                    }`}
                  >
                    {confirmLabel}
                  </BouncyButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
