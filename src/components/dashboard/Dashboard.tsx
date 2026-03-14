import React from 'react';
import { Profile, Expense, Balance } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Receipt,
  Image as ImageIcon,
  Sparkles,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';

interface DashboardProps {
  key?: React.Key;
  profile: Profile;
  partner: Profile;
  expenses: Expense[];
  onAdd: () => void;
  onSeeAll: () => void;
  onSettle: (unsettled: Expense[]) => void;
  onEdit: (expense: Expense) => void;
}

export const Dashboard = ({ profile, partner, expenses, onAdd, onSeeAll, onSettle, onEdit }: DashboardProps) => {
  const unsettledExpenses = expenses.filter(e => !e.is_settled);

  const calculateBalance = (): Balance => {
    let myPaid = 0;
    let myOwed = 0;
    let partnerPaid = 0;
    let partnerOwed = 0;

    unsettledExpenses.forEach(exp => {
      if (exp.payer_id === profile.id) {
        myPaid += exp.amount;
        myOwed += exp.other_share;
      } else {
        partnerPaid += exp.amount;
        partnerOwed += exp.other_share;
      }
    });

    return {
      totalPaidByMe: myPaid,
      totalOwedByPartner: myOwed,
      totalPaidByPartner: partnerPaid,
      totalOwedByMe: partnerOwed,
      netBalance: myOwed - partnerOwed
    };
  };

  const balance = calculateBalance();
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Balance Card */}
      <GlassCard 
        className={cn(
          "p-8 text-white relative overflow-hidden border-none",
          balance.netBalance > 0 ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-200" : 
          balance.netBalance < 0 ? "bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-200" : 
          "bg-gradient-to-br from-stone-700 to-stone-900 shadow-stone-200"
        )}
      >
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" 
        />
        
        <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] mb-2 font-sans">สรุปยอดรวม</p>
        <h2 className="text-6xl font-display tracking-tighter mb-6 drop-shadow-lg">
          ฿{Math.abs(balance.netBalance).toLocaleString()}
        </h2>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 py-2.5 px-5 bg-white/20 rounded-2xl w-fit backdrop-blur-md border border-white/20">
            {balance.netBalance > 0 ? (
              <>
                <ArrowDownLeft className="w-5 h-5" />
                <span className="text-sm font-bold font-sans">{partner?.display_name || 'แฟน'} ต้องจ่ายคุณน้าา</span>
              </>
            ) : balance.netBalance < 0 ? (
              <>
                <ArrowUpRight className="w-5 h-5" />
                <span className="text-sm font-bold font-sans">คุณต้องจ่าย {partner?.display_name || 'แฟน'} จ้าา</span>
              </>
            ) : (
              <span className="text-sm font-bold font-sans flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> ยอดเท่ากันพอดีเป๊ะ!
              </span>
            )}
          </div>

          {balance.netBalance !== 0 && (
            <BouncyButton 
              onClick={() => onSettle(unsettledExpenses)}
              className="bg-white text-stone-800 py-2.5 px-6 rounded-2xl text-sm font-bold shadow-xl border-none"
            >
              เคลียร์ยอด 💸
            </BouncyButton>
          )}
        </div>
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-5 bg-pastel-mint/40 border-emerald-100">
          <p className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mb-1 font-sans">คุณจ่ายไป</p>
          <p className="text-2xl font-display text-emerald-700">฿{balance.totalPaidByMe.toLocaleString()}</p>
        </GlassCard>
        <GlassCard className="p-5 bg-pastel-pink/40 border-rose-100">
          <p className="text-rose-600/60 text-[10px] font-bold uppercase tracking-widest mb-1 font-sans">{partner?.display_name || 'แฟน'} จ่าย</p>
          <p className="text-2xl font-display text-rose-700">฿{balance.totalPaidByPartner.toLocaleString()}</p>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xl font-display text-stone-800">รายการล่าสุด ✨</h3>
          <button onClick={onSeeAll} className="text-emerald-500 text-sm font-bold font-sans flex items-center gap-1 hover:underline">
            ดูทั้งหมด <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-4">
          {expenses.slice(0, 5).map(exp => (
            <ExpenseItem 
              key={exp.id} 
              expense={exp} 
              profile={profile} 
              partner={partner} 
              onClick={() => !exp.is_settled && onEdit(exp)}
              onPreview={(url) => setPreviewUrl(url)}
            />
          ))}
          {expenses.length === 0 && (
            <div className="text-center py-16 glass rounded-[2.5rem] border-2 border-dashed border-white/60">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              </motion.div>
              <p className="text-stone-400 font-display text-lg">ยังไม่มีรายการเลยยย</p>
            </div>
          )}
        </div>
      </div>

      <ImagePreviewModal 
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        imageUrl={previewUrl || ''}
      />
    </motion.div>
  );
};

export function ExpenseItem({ expense, profile, partner, onClick, onPreview }: { key?: React.Key, expense: Expense, profile: Profile, partner: Profile, onClick?: () => void, onPreview?: (url: string) => void }) {
  const isMe = expense.payer_id === profile.id;
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={cn(
        "glass p-4 rounded-3xl flex items-center justify-between group cursor-pointer transition-all",
        onClick && "hover:bg-white/40"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden",
          isMe ? "bg-emerald-100 text-emerald-500" : "bg-rose-100 text-rose-500"
        )}>
          {isMe ? (
            profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Me" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-7 h-7" />
            )
          ) : (
            partner.avatar_url ? (
              <img 
                src={partner.avatar_url} 
                alt="Partner" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-7 h-7" />
            )
          )}
        </div>
        <div>
          <h4 className="font-display text-xl text-stone-800 leading-tight">{expense.description}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {expense.notes && (
              <p className="text-xs text-stone-500 font-sans line-clamp-1 italic">
                "{expense.notes}"
              </p>
            )}
            {expense.receipt_url && onPreview && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(expense.receipt_url!);
                }}
                className="p-1 bg-stone-100 text-stone-400 rounded-md hover:bg-stone-200 hover:text-stone-600 transition-colors"
                title="ดูรูปใบเสร็จ"
              >
                <Receipt className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-stone-400 font-bold font-sans uppercase tracking-wider mt-1">
            {isMe ? 'คุณจ่าย' : `${partner?.display_name || 'แฟน'} จ่าย`} • {format(new Date(expense.created_at), 'd MMM yy', { locale: th })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-display text-2xl text-stone-800">฿{expense.amount.toLocaleString()}</p>
        <p className={cn("text-[10px] font-bold font-sans uppercase tracking-tighter", isMe ? "text-emerald-500" : "text-rose-500")}>
          {isMe ? `ทวงคืน ฿${expense.other_share}` : `ต้องจ่าย ฿${expense.other_share}`}
        </p>
      </div>
    </motion.div>
  );
}
