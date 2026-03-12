/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { 
  Plus, 
  Receipt, 
  History as HistoryIcon, 
  User as UserIcon, 
  Loader2,
  Heart,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile, Expense } from './types';
import { cn } from './lib/utils';

// Components
import { AuthScreen } from './components/auth/AuthScreen';
import { LinkPartnerScreen } from './components/partner/LinkPartnerScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import { ExpenseForm } from './components/expense/ExpenseForm';
import { HistoryView } from './components/history/HistoryView';
import { ProfileView } from './components/profile/ProfileView';
import { SettleUpModal } from './components/settlement/SettleUpModal';
import { ChatView } from './components/chat/ChatView';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'add' | 'history' | 'profile' | 'chat'>('dashboard');
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [unsettledToSettle, setUnsettledToSettle] = useState<Expense[]>([]);
  
  // Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setPartner(null);
        setExpenses([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({ 
              id: userData.user.id, 
              email: userData.user.email,
              display_name: userData.user.user_metadata?.display_name || userData.user.email?.split('@')[0],
              avatar_url: userData.user.user_metadata?.avatar_url || null
            })
            .select()
            .single();
          
          if (!createError) setProfile(newProfile);
        }
      } else if (data) {
        setProfile(data);
        if (data.partner_id) fetchPartner(data.partner_id);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartner = async (partnerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    if (data) {
      setPartner(data);
      fetchExpenses(profile?.id || '', data.id);
    }
  };

  const fetchExpenses = async (myId: string, partnerId: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .or(`payer_id.eq.${myId},payer_id.eq.${partnerId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
  };

  const calculateBalance = (allExpenses: Expense[], myId: string) => {
    let myPaid = 0;
    let myOwed = 0;
    let partnerPaid = 0;
    let partnerOwed = 0;

    allExpenses.filter(e => !e.is_settled).forEach(exp => {
      if (exp.payer_id === myId) {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
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
    return <AuthScreen setAuthLoading={setAuthLoading} authLoading={authLoading} />;
  }

  if (profile && !profile.partner_id) {
    return (
      <LinkPartnerScreen 
        profile={profile} 
        onLinked={() => fetchProfile(user.id)} 
        onLogout={handleLogout}
      />
    );
  }

  if (profile && profile.partner_id && !partner) {
    return (
      <div className="min-h-screen bg-pastel-blue/20 flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-rose-400 shadow-xl"
        >
          <Heart className="w-8 h-8 fill-current" />
        </motion.div>
        <p className="font-display text-xl text-stone-500 animate-pulse">กำลังโหลดข้อมูลแฟน... ✨</p>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-pastel-blue/10 text-stone-800 font-sans", view !== 'chat' && "pb-32")}>
      <main className={cn("max-w-md mx-auto h-full", view === 'chat' ? "px-0 pt-0" : "px-6 pt-12")}>
        <AnimatePresence mode="wait">
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
            />
          )}
          {view === 'add' && (
            <ExpenseForm 
              key="add"
              profile={profile!} 
              partner={partner!} 
              onClose={() => setView('dashboard')} 
              onSuccess={() => {
                fetchExpenses(profile!.id, partner!.id);
                setView('dashboard');
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
              onDelete={async (id) => {
                await supabase.from('expenses').delete().eq('id', id);
                fetchExpenses(profile!.id, partner!.id);
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
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {settleModalOpen && (
          <SettleUpModal 
            profile={profile!}
            partner={partner!}
            balance={calculateBalance(expenses, profile!.id)}
            unsettledExpenses={unsettledToSettle}
            onClose={() => setSettleModalOpen(false)}
            onSuccess={() => {
              setSettleModalOpen(false);
              fetchExpenses(profile!.id, partner!.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-sm bg-white/70 backdrop-blur-2xl border border-white/60 px-6 py-4 rounded-[2.5rem] flex justify-between items-center z-40 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<HistoryIcon className="w-6 h-6" />} label="หน้าแรก" />
        <NavButton active={view === 'chat'} onClick={() => setView('chat')} icon={<MessageCircle className="w-6 h-6" />} label="แชท" />
        
        <motion.button 
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setView('add')}
          className="w-14 h-14 bg-emerald-400 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 -mt-12 border-4 border-white"
        >
          <Plus className="w-8 h-8" />
        </motion.button>

        <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<Receipt className="w-6 h-6" />} label="รายการ" />
        <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon className="w-6 h-6" />} label="โปรไฟล์" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all", active ? "text-emerald-500 scale-110" : "text-stone-300")}>
      {icon}
      <span className="text-[10px] font-bold font-sans uppercase tracking-widest">{label}</span>
    </button>
  );
}
