import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { User, Loader2, ArrowLeft, HeartHandshake } from 'lucide-react';
import { motion } from 'motion/react';

export const LinkPartnerScreen = ({ profile, onLinked, onLogout }: { key?: React.Key, profile: Profile, onLinked: () => void, onLogout: () => void }) => {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const trimmedEmail = partnerEmail.trim().toLowerCase();
      const { data: partnerData, error: partnerError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', trimmedEmail)
        .single();

      if (partnerError) {
        if (partnerError.code === 'PGRST116') {
          setError('ไม่พบอีเมลนี้ในระบบน้าา กรุณาให้แฟนสมัครสมาชิกก่อน (เช็คตัวสะกดดีๆ น้า)');
        } else {
          setError(`เกิดข้อผิดพลาด: ${partnerError.message}`);
        }
        return;
      }

      if (partnerData.id === profile.id) {
        setError('เชื่อมต่อกับตัวเองไม่ได้นะจ๊ะ');
        return;
      }

      if (partnerData.partner_id && partnerData.partner_id !== profile.id) {
        setError('แฟนคนนี้เชื่อมต่อกับคนอื่นอยู่แล้วน้าา');
        return;
      }

      const { error: updateMe } = await supabase
        .from('profiles')
        .update({ partner_id: partnerData.id })
        .eq('id', profile.id);

      if (updateMe) throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ');

      onLinked();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-pastel-pink/20">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <BouncyButton variant="ghost" onClick={onLogout} className="p-2 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </BouncyButton>
          <span className="text-sm font-sans font-bold text-stone-400">ย้อนกลับไปหน้าล็อกอิน</span>
        </div>

        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 bg-pastel-mint rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-inner"
            >
              <HeartHandshake className="w-10 h-10" />
            </motion.div>
            <h1 className="text-3xl font-display text-stone-800">เชื่อมต่อกับแฟน</h1>
            <p className="text-stone-500 font-sans text-sm mt-2">ใส่อีเมลของแฟนเพื่อเริ่มหารตังกันน้าา</p>
          </div>

          <form onSubmit={handleLink} className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-500 text-xs rounded-xl border border-rose-100 text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">อีเมลของแฟน</label>
              <input 
                type="email" 
                required 
                value={partnerEmail} 
                onChange={e => setPartnerEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-sans text-sm"
                placeholder="honey@email.com"
              />
            </div>

            <BouncyButton 
              type="submit" 
              disabled={loading}
              className="w-full py-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'เชื่อมต่อเลยยย'}
            </BouncyButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
