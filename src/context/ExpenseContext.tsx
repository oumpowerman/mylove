import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Expense } from '../types';
import { useAuth } from './AuthContext';

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  fetchExpenses: () => Promise<void>;
  deleteExpense: (expense: Expense) => Promise<void>;
  calculateBalance: () => {
    totalPaidByMe: number;
    totalOwedByPartner: number;
    totalPaidByPartner: number;
    totalOwedByMe: number;
    netBalance: number;
  };
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, partner } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!profile?.id || !partner?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .or(`payer_id.eq.${profile.id},payer_id.eq.${partner.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
    setLoading(false);
  }, [profile?.id, partner?.id]);

  useEffect(() => {
    if (profile?.id && partner?.id) {
      fetchExpenses();

      const expensesSubscription = supabase
        .channel('expenses_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
          },
          () => {
            fetchExpenses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(expensesSubscription);
      };
    } else {
      setExpenses([]);
    }
  }, [profile?.id, partner?.id, fetchExpenses]);

  const deleteExpense = async (expense: Expense) => {
    if (!profile || !partner) return;

    const { data, error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expense.id)
      .select();

    if (deleteError) throw deleteError;

    if (data && data.length > 0) {
      // Send notification to chat
      await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: partner.id,
        content: `🚫 [ระบบ] ${profile.display_name} ได้ลบรายการ "${expense.description}" ยอด ฿${expense.amount.toLocaleString()} ออกไปแล้วน้าา`,
      });
      fetchExpenses();
    } else {
      throw new Error('No permission to delete or already deleted');
    }
  };

  const calculateBalance = useCallback(() => {
    if (!profile) return {
      totalPaidByMe: 0,
      totalOwedByPartner: 0,
      totalPaidByPartner: 0,
      totalOwedByMe: 0,
      netBalance: 0
    };

    let myPaid = 0;
    let myOwed = 0;
    let partnerPaid = 0;
    let partnerOwed = 0;

    expenses.filter(e => !e.is_settled).forEach(exp => {
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
  }, [expenses, profile]);

  return (
    <ExpenseContext.Provider value={{ expenses, loading, fetchExpenses, deleteExpense, calculateBalance }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
