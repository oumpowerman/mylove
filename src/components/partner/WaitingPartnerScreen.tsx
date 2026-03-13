import React from 'react';
import { Profile } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { Heart, Loader2, LogOut, RefreshCw, UserX } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/src/lib/supabase';

export const WaitingPartnerScreen = ({ 
  profile, 
  partner, 
  onLogout, 
  onCancel,
  onRefresh 
}: { 
  key?: React.Key,
  profile: Profile, 
  partner: Profile, 
  onLogout: () => void,
  onCancel: () => void,
  onRefresh: () => Promise<void> | void
}) => {
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Small delay for better feel
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-pastel-blue/20">
      <div className="w-full max-w-sm">
        <GlassCard className="p-8 text-center">
          <div className="relative mb-8">
            <div className="flex justify-center items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-display text-stone-300">{profile.display_name?.charAt(0)}</span>
                )}
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Heart className="w-6 h-6 text-rose-400 fill-current" />
              </motion.div>
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
                {partner.avatar_url ? (
                  <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-display text-stone-300">{partner.display_name?.charAt(0)}</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
              กำลังรอตอบรับ
            </div>
          </div>

          <h1 className="text-2xl font-display text-stone-800 mb-2">รอแฟนเชื่อมต่อกลับน้าา</h1>
          <p className="text-stone-500 font-sans text-sm mb-8">
            คุณส่งคำขอไปหา <span className="font-bold text-stone-700">{partner.display_name || partner.email}</span> แล้ว 
            บอกให้แฟนล็อกอินแล้วใส่อีเมลของคุณเพื่อยืนยันน้าา ✨
          </p>

          <div className="space-y-3">
            <BouncyButton 
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full py-4 flex items-center justify-center gap-2"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {refreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}
            </BouncyButton>

            <div className="grid grid-cols-2 gap-3">
              <BouncyButton 
                variant="ghost"
                onClick={onCancel}
                className="py-3 text-xs text-stone-400 hover:text-rose-500"
              >
                <UserX className="w-4 h-4 mr-2" /> ยกเลิกคำขอ
              </BouncyButton>
              <BouncyButton 
                variant="ghost"
                onClick={onLogout}
                className="py-3 text-xs text-stone-400 hover:text-stone-600"
              >
                <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
              </BouncyButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
