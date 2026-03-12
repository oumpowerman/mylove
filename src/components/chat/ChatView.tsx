import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Message } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { Send, Image as ImageIcon, Loader2, User, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/src/lib/utils';

interface ChatViewProps {
  key?: React.Key;
  profile: Profile;
  partner: Profile;
  onBack?: () => void;
}

export const ChatView = ({ profile, partner, onBack }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=in.(${profile.id},${partner.id})`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: partner.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-screen w-full max-w-md mx-auto pb-[100px]"
    >
      <div className="flex items-center justify-between px-6 pt-10 pb-4 bg-white/30 backdrop-blur-md border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-stone-100 flex items-center justify-center overflow-hidden">
            {partner.avatar_url ? (
              <img src={partner.avatar_url} alt={partner.display_name || ''} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-stone-300" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-display text-stone-800 leading-tight">{partner.display_name || 'แฟน'} ✨</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-[9px] text-emerald-500 font-bold font-sans uppercase tracking-widest">ออนไลน์</p>
            </div>
          </div>
        </div>
        
        {onBack && (
          <BouncyButton 
            variant="ghost" 
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-400 hover:text-rose-400 hover:bg-rose-50 transition-all"
          >
            <Heart className="w-5 h-5 fill-current" />
          </BouncyButton>
        )}
      </div>

      <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-white/60 rounded-t-[2.5rem] sm:rounded-b-[2.5rem]">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-300">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <p className="text-stone-400 font-display text-lg">เริ่มคุยกับแฟนได้เลยยย ✨</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === profile.id;
              const prevMsg = messages[idx - 1];
              const showTime = !prevMsg || 
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000;

              return (
                <div key={msg.id} className="space-y-1">
                  {showTime && (
                    <p className="text-[9px] text-stone-400 text-center font-bold font-sans uppercase tracking-widest py-2">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: th })}
                    </p>
                  )}
                  <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "max-w-[80%] px-4 py-3 rounded-2xl text-sm font-sans shadow-sm",
                        isMe 
                          ? "bg-emerald-500 text-white rounded-tr-none" 
                          : "bg-white text-stone-700 rounded-tl-none border border-stone-100"
                      )}
                    >
                      {msg.content}
                    </motion.div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form 
          onSubmit={handleSend}
          className="p-4 bg-white/90 backdrop-blur-2xl border-t border-white/40 flex items-end gap-3"
        >
          <BouncyButton 
            type="button"
            variant="ghost" 
            className="p-3 rounded-2xl text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
          >
            <ImageIcon className="w-6 h-6" />
          </BouncyButton>
          
          <div className="flex-1 relative">
            <textarea 
              rows={1}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              className="w-full bg-stone-100/80 border-2 border-transparent rounded-[1.8rem] px-5 py-3 text-sm font-sans focus:bg-white focus:border-emerald-400/50 outline-none shadow-inner transition-all resize-none max-h-32 overflow-y-auto"
            />
          </div>

          <BouncyButton 
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300 shadow-lg",
              newMessage.trim() 
                ? "bg-emerald-500 text-white shadow-emerald-200 scale-105" 
                : "bg-stone-200 text-stone-400 shadow-none scale-100"
            )}
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className={cn("w-6 h-6 transition-transform", newMessage.trim() && "rotate-12")} />
            )}
          </BouncyButton>
        </form>
      </GlassCard>
    </motion.div>
  );
};
