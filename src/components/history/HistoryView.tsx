import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Expense, Profile, Settlement } from '@/src/types';
import { BouncyButton } from '../ui/BouncyButton';
import { ExpenseItem } from '../dashboard/Dashboard';
import { ChevronLeft, Trash2, Receipt, History as HistoryIcon, CheckCircle2, Wallet, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/src/lib/utils';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';

interface HistoryViewProps {
  key?: React.Key;
  expenses: Expense[];
  profile: Profile;
  partner: Profile;
  onBack: () => void;
  onDelete: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
}

export const HistoryView = ({ expenses, profile, partner, onBack, onDelete, onEdit }: HistoryViewProps) => {
  const [activeTab, setActiveTab] = useState<'current' | 'settled' | 'settlements'>('current');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'settlements') {
      fetchSettlements();

      // Real-time subscription for settlements
      const channel = supabase
        .channel('settlements_realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'settlements',
          },
          () => {
            fetchSettlements();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeTab, profile.id, partner.id]);

  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSettlements(data);
      }
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoadingSettlements(false);
    }
  };

  const currentExpenses = expenses.filter(e => !e.is_settled);
  const settledExpenses = expenses.filter(e => e.is_settled);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BouncyButton variant="ghost" onClick={onBack} className="p-2 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </BouncyButton>
          <h2 className="text-3xl font-display text-stone-800">ประวัติ ✨</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-white shadow-inner">
        <TabButton active={activeTab === 'current'} onClick={() => setActiveTab('current')} label="ปัจจุบัน" count={currentExpenses.length} />
        <TabButton active={activeTab === 'settled'} onClick={() => setActiveTab('settled')} label="ที่เคลียร์แล้ว" count={settledExpenses.length} />
        <TabButton active={activeTab === 'settlements'} onClick={() => setActiveTab('settlements')} label="ประวัติโอน" />
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'current' && (
            <motion.div key="current" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {currentExpenses.map(exp => (
                <div key={exp.id} className="relative group">
                  <ExpenseItem 
                    expense={exp} 
                    profile={profile} 
                    partner={partner} 
                    onClick={() => onEdit(exp)}
                    onPreview={(url) => setPreviewUrl(url)}
                  />
                  <div className="absolute -right-2 -top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(exp)}
                      className="w-10 h-10 bg-emerald-400 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDelete(exp)}
                      className="w-10 h-10 bg-rose-400 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {currentExpenses.length === 0 && <EmptyState icon={<Receipt className="w-16 h-16" />} text="ยังไม่มีรายการที่ค้างอยู่น้าา" />}
            </motion.div>
          )}

          {activeTab === 'settled' && (
            <motion.div key="settled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {settledExpenses.map(exp => (
                <div key={exp.id} className="opacity-70 grayscale-[0.5]">
                  <ExpenseItem 
                    expense={exp} 
                    profile={profile} 
                    partner={partner} 
                    onPreview={(url) => setPreviewUrl(url)}
                  />
                </div>
              ))}
              {settledExpenses.length === 0 && <EmptyState icon={<CheckCircle2 className="w-16 h-16" />} text="ยังไม่มีรายการที่เคลียร์แล้วจ้าา" />}
            </motion.div>
          )}

          {activeTab === 'settlements' && (
            <motion.div key="settlements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {settlements.map(settle => (
                <SettlementItem 
                  key={settle.id} 
                  settlement={settle} 
                  profile={profile} 
                  partner={partner} 
                  onPreview={(url) => setPreviewUrl(url)}
                />
              ))}
              {settlements.length === 0 && !loadingSettlements && <EmptyState icon={<HistoryIcon className="w-16 h-16" />} text="ยังไม่มีประวัติการโอนจ้าา" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ImagePreviewModal 
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        imageUrl={previewUrl || ''}
      />
    </motion.div>
  );
};

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-3 rounded-xl font-display text-sm transition-all flex items-center justify-center gap-2",
        active ? "bg-white text-emerald-500 shadow-sm" : "text-stone-400 hover:text-stone-600"
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full", active ? "bg-emerald-100 text-emerald-600" : "bg-stone-100 text-stone-400")}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="text-center py-24 glass rounded-[2.5rem] border-2 border-dashed border-white/60">
      <div className="text-stone-200 mx-auto mb-4 flex justify-center">{icon}</div>
      <p className="text-stone-400 font-display text-xl">{text}</p>
    </div>
  );
}

function SettlementItem({ settlement, profile, partner, onPreview }: { key?: React.Key, settlement: Settlement, profile: Profile, partner: Profile, onPreview: (url: string) => void }) {
  const isFromMe = settlement.from_user_id === profile.id;
  
  return (
    <div className="glass p-5 rounded-3xl flex items-center justify-between border-l-4 border-emerald-400">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-display text-lg text-stone-800">
            {isFromMe ? `คุณโอนให้ ${partner.display_name}` : `${partner.display_name} โอนให้คุณ`}
          </h4>
          <p className="text-[10px] text-stone-400 font-bold font-sans uppercase tracking-wider mt-1">
            {format(new Date(settlement.created_at), 'd MMM yy • HH:mm', { locale: th })}
          </p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
        <p className="font-display text-2xl text-emerald-600">฿{settlement.amount.toLocaleString()}</p>
        <div className="flex items-center gap-2">
          {settlement.proof_url && (
            <button 
              onClick={() => onPreview(settlement.proof_url!)} 
              className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg hover:bg-emerald-100 transition-colors"
              title="ดูสลิปการโอน"
            >
              <Receipt className="w-4 h-4" />
            </button>
          )}
          <p className="text-[10px] font-bold text-stone-300 font-sans uppercase tracking-tighter">สำเร็จ ✨</p>
        </div>
      </div>
    </div>
  );
}
