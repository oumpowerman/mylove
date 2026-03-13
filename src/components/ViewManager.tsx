import React, { useState } from 'react';
import { 
  Plus, 
  Receipt, 
  History as HistoryIcon, 
  User as UserIcon, 
  Heart,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useExpenses } from '../context/ExpenseContext';
import { useDialog } from '../context/DialogContext';
import { Expense } from '../types';

// Components
import { AuthScreen } from './auth/AuthScreen';
import { LinkPartnerScreen } from './partner/LinkPartnerScreen';
import { WaitingPartnerScreen } from './partner/WaitingPartnerScreen';
import { Dashboard } from './dashboard/Dashboard';
import { ExpenseForm } from './expense/ExpenseForm';
import { HistoryView } from './history/HistoryView';
import { ProfileView } from './profile/ProfileView';
import { ChatView } from './chat/ChatView';
import { SettleUpModal } from './settlement/SettleUpModal';

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all duration-300",
      active ? "text-emerald-500 scale-110" : "text-stone-400 hover:text-stone-600"
    )}
  >
    <div className={cn(
      "p-2 rounded-2xl transition-all",
      active ? "bg-emerald-50 shadow-lg shadow-emerald-100" : "bg-transparent"
    )}>
      {icon}
    </div>
    <span className="text-[10px] font-medium uppercase tracking-widest">{label}</span>
  </button>
);

export const ViewManager = () => {
  const { user, profile, partner, loading: authLoading, logout, cancelLink, refreshProfile } = useAuth();
  const { expenses, fetchExpenses, deleteExpense, calculateBalance } = useExpenses();
  const { showDialog, hideDialog } = useDialog();
  
  const [view, setView] = useState<'dashboard' | 'add' | 'history' | 'profile' | 'chat'>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [authScreenLoading, setAuthScreenLoading] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [unsettledToSettle, setUnsettledToSettle] = useState<Expense[]>([]);

  const balance = calculateBalance();

  const handleLogout = () => {
    showDialog({
      title: 'ออกจากระบบใช่ไหมน้าา?',
      description: 'ถ้าออกแล้วต้องล็อกอินใหม่เพื่อมาบันทึกความรักกับแฟนต่อนะจ๊ะ',
      confirmLabel: 'ออกเลย',
      variant: 'danger',
      onConfirm: async () => {
        await logout();
        hideDialog();
      }
    });
  };

  const handleCancelLink = () => {
    showDialog({
      title: 'ยกเลิกคำขอใช่ไหมน้าา?',
      description: 'คุณแน่ใจนะว่าจะยกเลิกการเชื่อมต่อกับคนนี้? ถ้ากดยกเลิกแล้วต้องใส่อีเมลแฟนใหม่นะจ๊ะ',
      confirmLabel: 'ยกเลิกเลย',
      variant: 'danger',
      onConfirm: async () => {
        await cancelLink();
        hideDialog();
      }
    });
  };

  const handleDeleteExpense = (expense: Expense) => {
    showDialog({
      title: 'ลบรายการใช่ไหมน้าา?',
      description: `คุณกำลังจะลบรายการ "${expense.description}" ยอด ฿${expense.amount.toLocaleString()} การลบนี้จะถูกแจ้งเตือนไปในแชทด้วยน้าา`,
      confirmLabel: 'ลบเลย',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteExpense(expense);
          hideDialog();
        } catch (err: any) {
          showDialog({
            title: 'ลบไม่สำเร็จน้าา 😭',
            description: err.message === 'No permission to delete or already deleted' 
              ? 'คุณอาจจะไม่มีสิทธิ์ลบรายการนี้ หรือรายการนี้ถูกลบไปก่อนแล้วจ้า'
              : 'เกิดข้อผิดพลาดในการลบรายการจ้า',
            confirmLabel: 'รับทราบ',
            variant: 'danger',
            onConfirm: hideDialog
          });
        }
      }
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-pastel-blue/20 flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-rose-400 shadow-xl"
        >
          <Heart className="w-8 h-8 fill-current" />
        </motion.div>
        <p className="font-display text-xl text-stone-500 animate-pulse">กำลังโหลดน้าา...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen setAuthLoading={setAuthScreenLoading} authLoading={authScreenLoading} />;
  }

  const isFullyLinked = profile && partner && partner.partner_id === profile.id;

  return (
    <div className={cn("min-h-screen bg-pastel-blue/10 text-stone-800 font-sans", (isFullyLinked && view !== 'chat') && "pb-32")}>
      <main className={cn("max-w-md mx-auto h-full", (isFullyLinked && view === 'chat') ? "px-0 pt-0" : "px-6 pt-12")}>
        <AnimatePresence mode="wait">
          {profile && !profile.partner_id ? (
            <LinkPartnerScreen 
              key="link-partner"
              profile={profile} 
              onLinked={refreshProfile} 
              onLogout={handleLogout}
            />
          ) : profile && profile.partner_id && !partner ? (
            <div key="loading-partner" className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-rose-400 shadow-xl"
              >
                <Heart className="w-8 h-8 fill-current" />
              </motion.div>
              <p className="font-display text-xl text-stone-500 animate-pulse">กำลังโหลดข้อมูลแฟน... ✨</p>
            </div>
          ) : profile && partner && partner.partner_id !== profile.id ? (
            <WaitingPartnerScreen 
              key="waiting-partner"
              profile={profile} 
              partner={partner} 
              onLogout={handleLogout}
              onCancel={handleCancelLink}
              onRefresh={async () => {
                const result = await refreshProfile();
                if (!(result.profile && result.partner && result.partner.partner_id === result.profile.id)) {
                  showDialog({
                    title: 'ยังเชื่อมต่อไม่สำเร็จน้าา 🥺',
                    description: 'แฟนของคุณยังไม่ได้กดเชื่อมต่อกลับมาเลยจ้า ลองบอกให้แฟนเช็คอีเมลที่คุณใส่ไป (ต้องตรงกันเป๊ะๆ น้า) หรือให้แฟนลองกดรีเฟรชหน้าจอของเขาดูนะจ๊ะ ✨',
                    confirmLabel: 'รับทราบจ้า',
                    variant: 'info',
                    onConfirm: hideDialog
                  });
                }
              }}
            />
          ) : (
            <>
              {view === 'dashboard' && (
                <Dashboard 
                  key="dashboard"
                  profile={profile!} 
                  partner={partner!} 
                  expenses={expenses} 
                  onAdd={() => setView('add')}
                  onSeeAll={() => setView('history')}
                  onSettle={(unsettled) => {
                    setUnsettledToSettle(unsettled);
                    setSettleModalOpen(true);
                  }}
                  onEdit={(expense) => {
                    setEditingExpense(expense);
                    setView('add');
                  }}
                />
              )}
              {view === 'add' && (
                <ExpenseForm 
                  key="add"
                  profile={profile!} 
                  partner={partner!} 
                  initialData={editingExpense}
                  onClose={() => {
                    setView('dashboard');
                    setEditingExpense(null);
                  }} 
                  onSuccess={() => {
                    fetchExpenses();
                    setView('dashboard');
                    setEditingExpense(null);
                  }}
                />
              )}
              {view === 'history' && (
                <HistoryView 
                  key="history"
                  expenses={expenses} 
                  profile={profile!} 
                  partner={partner!}
                  onBack={() => setView('dashboard')} 
                  onDelete={handleDeleteExpense}
                  onEdit={(expense) => {
                    setEditingExpense(expense);
                    setView('add');
                  }}
                />
              )}
              {view === 'profile' && (
                <ProfileView 
                  key="profile"
                  profile={profile!} 
                  partner={partner!} 
                  onLogout={handleLogout} 
                  onBack={() => setView('dashboard')} 
                />
              )}
              {view === 'chat' && (
                <ChatView 
                  key="chat"
                  profile={profile!} 
                  partner={partner!} 
                  onBack={() => setView('dashboard')}
                />
              )}
            </>
          )}
        </AnimatePresence>
      </main>

      {settleModalOpen && profile && partner && (
        <SettleUpModal 
          profile={profile}
          partner={partner}
          balance={balance}
          unsettledExpenses={unsettledToSettle}
          onClose={() => setSettleModalOpen(false)}
          onSuccess={() => {
            fetchExpenses();
            setSettleModalOpen(false);
          }}
        />
      )}

      {isFullyLinked && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-sm bg-white/70 backdrop-blur-2xl border border-white/60 px-6 py-4 rounded-[2.5rem] flex justify-between items-center z-40 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<HistoryIcon className="w-6 h-6" />} label="หน้าแรก" />
          <NavButton active={view === 'chat'} onClick={() => setView('chat')} icon={<MessageCircle className="w-6 h-6" />} label="แชท" />
          
          <motion.button 
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setEditingExpense(null);
              setView('add');
            }}
            className="w-14 h-14 bg-emerald-400 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 -mt-12 border-4 border-white"
          >
            <Plus className="w-8 h-8" />
          </motion.button>

          <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<Receipt className="w-6 h-6" />} label="รายการ" />
          <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon className="w-6 h-6" />} label="โปรไฟล์" />
        </nav>
      )}
    </div>
  );
};
