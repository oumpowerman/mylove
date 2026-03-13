import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ExternalLink } from 'lucide-react';
import { BouncyButton } from './BouncyButton';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title = 'รูปภาพหลักฐาน ✨' 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/90 backdrop-blur-sm"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center gap-6"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between text-white px-2">
              <h3 className="text-xl font-display">{title}</h3>
              <div className="flex items-center gap-2">
                <a 
                  href={imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <BouncyButton 
                  variant="ghost" 
                  onClick={onClose}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white"
                >
                  <X className="w-6 h-6" />
                </BouncyButton>
              </div>
            </div>

            {/* Image Container */}
            <div className="relative w-full flex-1 bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Footer / Tip */}
            <p className="text-white/40 text-xs font-sans tracking-widest uppercase">
              แตะที่ว่างเพื่อปิดจ้าา ✨
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
