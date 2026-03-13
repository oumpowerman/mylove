export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  partner_id: string | null;
  avatar_url: string | null;
}

export interface Expense {
  id: string;
  created_at: string;
  payer_id: string;
  amount: number;
  description: string;
  receipt_url: string | null;
  other_user_id: string;
  other_share: number;
  is_settled: boolean;
  settlement_id: string | null;
  notes: string | null;
  payer?: Profile;
}

export interface Settlement {
  id: string;
  created_at: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  notes: string | null;
  proof_url: string | null;
}

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
}

export interface Balance {
  totalPaidByMe: number;
  totalOwedByPartner: number;
  totalPaidByPartner: number;
  totalOwedByMe: number;
  netBalance: number; // Positive means partner owes me, negative means I owe partner
}
