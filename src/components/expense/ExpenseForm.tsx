import React, { useState, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { Camera, X, Loader2, Sparkles, Receipt } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { handleFirestoreError, OperationType } from '@/src/lib/error-handler';

export const ExpenseForm = ({ profile, partner, onClose, onSuccess }: { key?: React.Key, profile: Profile, partner: Profile, onClose: () => void, onSuccess: () => void }) => {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customShare, setCustomShare] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setLoading(true);

    try {
      let receipt_url = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, image);
        
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
        receipt_url = publicUrl;
      }

      const totalAmount = parseFloat(amount);
      const otherShare = splitType === 'equal' ? totalAmount / 2 : parseFloat(customShare);

      const { error } = await supabase.from('expenses').insert({
        payer_id: profile.id,
        amount: totalAmount,
        description,
        notes: notes.trim() || null,
        receipt_url,
        other_user_id: partner.id,
        other_share: otherShare
      });

      if (error) throw error;
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="p-8 border-none shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display text-stone-800">เพิ่มรายการใหม่ ✨</h2>
        <BouncyButton variant="ghost" onClick={onClose} className="p-2 rounded-full">
          <X className="w-6 h-6" />
        </BouncyButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          className="relative w-full aspect-video bg-white/40 rounded-[2rem] border-4 border-dashed border-white flex flex-col items-center justify-center cursor-pointer overflow-hidden group shadow-inner"
        >
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-display text-xl gap-2">
                <Camera className="w-6 h-6" /> เปลี่ยนรูปจ้า
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-stone-300 mb-3 shadow-sm">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-stone-400 font-display text-lg">แนบใบเสร็จหน่อยน้าา</p>
            </>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
        </motion.div>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">รายละเอียด</label>
            <input 
              type="text" 
              required 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-display text-xl"
              placeholder="กินอะไรมาน้าา?"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">หมายเหตุเพิ่มเติม</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full px-5 py-3 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-sans text-sm min-h-[80px]"
              placeholder="จดอะไรไว้หน่อยมั้ยน้าา..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">จำนวนเงินทั้งหมด</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-display text-2xl">฿</span>
              <input 
                type="number" 
                required 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-12 pr-5 py-5 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all text-4xl font-display"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">หารกันยังไงดี?</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setSplitType('equal')}
                className={cn(
                  "py-4 rounded-2xl font-display text-lg border-2 transition-all",
                  splitType === 'equal' ? "bg-emerald-400 text-white border-emerald-400 shadow-lg shadow-emerald-100" : "bg-white/50 text-stone-400 border-white"
                )}
              >
                หารเท่ากัน (50/50)
              </button>
              <button 
                type="button"
                onClick={() => setSplitType('custom')}
                className={cn(
                  "py-4 rounded-2xl font-display text-lg border-2 transition-all",
                  splitType === 'custom' ? "bg-emerald-400 text-white border-emerald-400 shadow-lg shadow-emerald-100" : "bg-white/50 text-stone-400 border-white"
                )}
              >
                กำหนดเองน้าา
              </button>
            </div>
          </div>

          {splitType === 'custom' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">ยอดที่ {partner?.display_name || 'แฟน'} ต้องจ่าย</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 font-display text-xl">฿</span>
                <input 
                  type="number" 
                  required 
                  value={customShare} 
                  onChange={e => setCustomShare(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-display text-xl"
                  placeholder="0.00"
                />
              </div>
            </motion.div>
          )}
        </div>

        <BouncyButton 
          type="submit" 
          disabled={loading}
          className="w-full py-5 text-xl mt-4"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" /> บันทึกเลยยย
            </span>
          )}
        </BouncyButton>
      </form>
    </GlassCard>
  );
};
