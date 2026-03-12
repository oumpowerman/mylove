import React from 'react';
import { Profile } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { ChevronLeft, LogOut, User, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export const ProfileView = ({ profile, partner, onLogout, onBack }: { key?: React.Key, profile: Profile, partner: Profile, onLogout: () => void, onBack: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <BouncyButton variant="ghost" onClick={onBack} className="p-2 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </BouncyButton>
        <h2 className="text-3xl font-display text-stone-800">โปรไฟล์ ✨</h2>
      </div>

      <GlassCard className="p-10 space-y-10 border-none">
        <div className="flex flex-col items-center text-center">
          <motion.div 
            whileHover={{ rotate: [0, -10, 10, 0] }}
            className="w-32 h-32 bg-gradient-to-br from-pastel-pink to-rose-200 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-display mb-6 shadow-xl shadow-rose-100 border-4 border-white overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile?.display_name || ''} className="w-full h-full object-cover" />
            ) : (
              profile?.display_name?.charAt(0).toUpperCase()
            )}
          </motion.div>
          <h3 className="text-3xl font-display text-stone-800">{profile?.display_name || 'คุณ'}</h3>
          <p className="text-stone-400 font-sans text-sm">{profile?.email}</p>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-white/40 rounded-[2rem] border border-white/60 relative overflow-hidden">
            <Heart className="absolute -right-4 -bottom-4 w-20 h-20 text-rose-100/50 fill-current" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 font-sans">เชื่อมต่อกับหวานใจ</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-300 text-xl font-display shadow-sm border border-rose-50 overflow-hidden">
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt={partner?.display_name || ''} className="w-full h-full object-cover" />
                ) : (
                  partner?.display_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-display text-xl text-stone-800">{partner?.display_name || 'แฟน'}</p>
                <p className="text-[10px] font-bold text-stone-300 font-sans uppercase tracking-tighter">สถานะ: รักกันดีม้ากกก</p>
              </div>
            </div>
          </div>
        </div>

        <BouncyButton 
          variant="danger"
          onClick={onLogout}
          className="w-full py-5 text-xl"
        >
          <LogOut className="w-6 h-6" /> ออกจากระบบน้าา
        </BouncyButton>
      </GlassCard>
    </motion.div>
  );
};
