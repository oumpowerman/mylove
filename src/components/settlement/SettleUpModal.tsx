import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Balance, Expense } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { X, CheckCircle2, Loader2, Wallet, ArrowRight, Camera, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleDriveService } from '@/src/services/googleDriveService';

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
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gdStatus, setGdStatus] = useState<'idle' | 'authenticating' | 'authenticated' | 'error'>(
    GoogleDriveService.isAuthenticated() ? 'authenticated' : 'idle'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleConnectGD = async () => {
    setGdStatus('authenticating');
    try {
      await GoogleDriveService.authenticate();
      setGdStatus('authenticated');
    } catch (err) {
      console.error('GD Auth Error:', err);
      setGdStatus('error');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSettle = async () => {
    setLoading(true);
    try {
      const amount = Math.abs(balance.netBalance);
      const fromId = balance.netBalance < 0 ? profile.id : partner.id;
      const toId = balance.netBalance < 0 ? partner.id : profile.id;

      let proofUrl = null;
      if (image) {
        try {
          proofUrl = await GoogleDriveService.uploadFile(image);
        } catch (err) {
          console.error('Google Drive upload failed:', err);
          // Fallback to Supabase if Google Drive fails or is not configured
          const fileExt = image.name.split('.').pop();
          const fileName = `settlement_${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, image);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
            proofUrl = publicUrl;
          }
        }
      }

      // 1. Create settlement record
      const { data: settlement, error: settleError } = await supabase
        .from('settlements')
        .insert({
          from_user_id: fromId,
          to_user_id: toId,
          amount: amount,
          notes: `เคลียร์ยอด ฿${amount.toLocaleString()}`,
          proof_url: proofUrl
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

      // 3. Send notification to chat
      await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: partner.id,
        content: `💸 [ระบบ] ${profile.display_name} ได้เคลียร์ยอด ฿${amount.toLocaleString()} เรียบร้อยแล้วน้าา${proofUrl ? ' (มีแนบหลักฐานด้วยจ้า)' : ''}`,
      });

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
    <div className="fixed inset-0 z-[100] overflow-y-auto px-6 py-10 flex justify-center items-start sm:items-center">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md relative z-10 my-auto"
      >
        <GlassCard className="p-6 sm:p-8 border-none shadow-2xl relative">
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

                  {/* Image Upload for Slip */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">แนบสลิปการโอน (ถ้ามี)</label>
                      
                      {/* Google Drive Status */}
                      {GoogleDriveService.isConfigured() && (
                        <div className="flex items-center gap-1.5">
                          {gdStatus === 'authenticated' ? (
                            <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              GD Connected
                            </div>
                          ) : gdStatus === 'authenticating' ? (
                            <div className="flex items-center gap-1 text-[9px] text-stone-400 font-bold uppercase tracking-widest">
                              <Loader2 className="w-2 h-2 animate-spin" />
                              Connecting...
                            </div>
                          ) : (
                            <button 
                              onClick={handleConnectGD}
                              className="text-[9px] text-rose-400 font-bold uppercase tracking-widest hover:underline"
                            >
                              Link Google Drive 🔗
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-full aspect-[16/9] bg-white/40 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner"
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Slip Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-display text-sm gap-2">
                            <Camera className="w-5 h-5" /> เปลี่ยนรูปจ้า
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-stone-300 mb-2 shadow-sm">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <p className="text-stone-400 font-display text-sm">กดเพื่อแนบสลิปน้าา</p>
                        </>
                      )}
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                    </motion.div>
                  </div>
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
