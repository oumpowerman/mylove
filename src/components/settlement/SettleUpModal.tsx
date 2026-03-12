import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Balance, Expense } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { X, CheckCircle2, Loader2, Wallet, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettleUpModalProps {
  profile: Profile;
  partner: Profile;
  balance: Balance;
  unsettledExpenses: Expense[];
  onClose: () => void;
  onSuccess: () => void;
}

export const SettleUpModal = ({ profile, partner, balance, unsettledExpenses, onClose, onSuccess }: SettleUpModalProps) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');

  const handleSettle = async () => {
    setLoading(true);
    try {
      const amount = Math.abs(balance.netBalance);
      const fromId = balance.netBalance < 0 ? profile.id : partner.id;
      const toId = balance.netBalance < 0 ? partner.id : profile.id;

      // 1. Create settlement record
      const { data: settlement, error: settleError } = await supabase
        .from('settlements')
        .insert({
          from_user_id: fromId,
          to_user_id: toId,
          amount: amount,
          notes: `เคลียร์ยอด ฿${amount.toLocaleString()}`
        })
        .select()
        .single();

      if (settleError) throw settleError;

      // 2. Update all unsettled expenses
      const expenseIds = unsettledExpenses.map(e => e.id);
      const { error: updateError } = await supabase
        .from('expenses')
        .update({ 
          is_settled: true,
          settlement_id: settlement.id
        })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      setStep('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error settling up:', err);
      alert('เกิดข้อผิดพลาดในการเคลียร์ยอดน้าา');
    } finally {
      setLoading(false);
    }
  };

  const isMePaying = balance.netBalance < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 border-none shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'confirm' ? (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-display text-stone-800">เคลียร์ยอด ✨</h2>
                  <BouncyButton variant="ghost" onClick={onClose} className="p-2 rounded-full">
                    <X className="w-6 h-6" />
                  </BouncyButton>
                </div>

                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
                        {isMePaying ? (
                          profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <Wallet className="w-8 h-8 text-stone-300" />
                        ) : (
                          partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover" /> : <Wallet className="w-8 h-8 text-stone-300" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">ผู้โอน</span>
                    </div>

                    <ArrowRight className="w-8 h-8 text-emerald-400 animate-pulse" />

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
                        {!isMePaying ? (
                          profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <Wallet className="w-8 h-8 text-stone-300" />
                        ) : (
                          partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover" /> : <Wallet className="w-8 h-8 text-stone-300" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">ผู้รับ</span>
                    </div>
                  </div>

                  <div className="py-6">
                    <p className="text-stone-400 font-sans text-sm mb-1">ยอดที่ต้องเคลียร์ทั้งหมด</p>
                    <h3 className="text-5xl font-display text-emerald-500 tracking-tighter">
                      ฿{Math.abs(balance.netBalance).toLocaleString()}
                    </h3>
                  </div>

                  <p className="text-stone-500 font-sans text-sm bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    {isMePaying 
                      ? `คุณต้องโอนเงินให้ ${partner.display_name} จำนวน ฿${Math.abs(balance.netBalance).toLocaleString()} เมื่อโอนแล้วให้กดปุ่มด้านล่างเพื่อรีเซ็ตยอดน้าา`
                      : `${partner.display_name} ต้องโอนเงินให้คุณ จำนวน ฿${Math.abs(balance.netBalance).toLocaleString()} เมื่อได้รับเงินแล้วให้กดปุ่มด้านล่างเพื่อรีเซ็ตยอดน้าา`
                    }
                  </p>
                </div>

                <BouncyButton 
                  onClick={handleSettle}
                  disabled={loading}
                  className="w-full py-5 text-xl"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ยืนยันการเคลียร์ยอด 💸'}
                </BouncyButton>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div>
                  <h2 className="text-3xl font-display text-stone-800">เคลียร์ยอดสำเร็จ! ✨</h2>
                  <p className="text-stone-500 font-sans mt-2">ยอดเงินถูกรีเซ็ตเรียบร้อยแล้วจ้าา</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
};
