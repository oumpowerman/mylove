import React, { useState, useRef } from 'react';
import { supabase } from '@/src/lib/supabase';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { Loader2, Heart, Sparkles, User, Lock, Mail, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthScreen = ({ setAuthLoading, authLoading }: { setAuthLoading: (v: boolean) => void, authLoading: boolean }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsUpdatingPassword(true);
      }
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');
    
    try {
      if (isUpdatingPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        alert('เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้วจ้า! เข้าสู่ระบบได้เลย ✨');
        setIsUpdatingPassword(false);
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        alert('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้วน้าา เช็คดูได้เลย! ✨');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        let avatar_url = null;
        
        if (avatar) {
          const fileExt = avatar.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(`avatars/${fileName}`, avatar);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(`avatars/${fileName}`);
            avatar_url = publicUrl;
          }
        }

        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              display_name: displayName,
              avatar_url: avatar_url
            }
          }
        });
        if (error) throw error;
        alert('สมัครสมาชิกสำเร็จ! กรุณาเช็คอีเมลเพื่อยืนยันตัวตน (ถ้ามี)');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute -top-20 -left-20 w-64 h-64 bg-pastel-pink/40 rounded-full blur-3xl" 
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute -bottom-20 -right-20 w-80 h-80 bg-pastel-mint/40 rounded-full blur-3xl" 
      />

      <div className="w-full max-w-sm z-10">
        <div className="text-center mb-4">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-400 text-3xl shadow-xl mx-auto mb-3 border-4 border-white"
          >
            <Heart className="w-8 h-8 fill-current" />
          </motion.div>
          <h1 className="text-3xl font-display text-stone-800 tracking-tight">HoneyMoney</h1>
          <p className="text-stone-500 font-sans text-xs mt-1">แอปบันทึกค่าใช้จ่ายสุดคิวท์สำหรับคู่รัก 💖</p>
        </div>

        <AnimatePresence mode="wait">
          <GlassCard key={isUpdatingPassword ? 'update' : isForgotPassword ? 'forgot' : isSignUp ? 'signup' : 'login'} className="p-6">
            <h2 className="text-xl font-display text-center mb-4 text-stone-700">
              {isUpdatingPassword ? 'ตั้งรหัสผ่านใหม่' : isForgotPassword ? 'ลืมรหัสผ่านเหรอ?' : isSignUp ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}
            </h2>

            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-rose-50 text-rose-500 text-xs rounded-xl border border-rose-100 text-center"
                >
                  {error}
                </motion.div>
              )}

              {isUpdatingPassword && (
                <p className="text-xs text-stone-500 text-center mb-2">
                  ระบุรหัสผ่านใหม่ที่คุณต้องการใช้ได้เลยจ้า ✨
                </p>
              )}

              {isForgotPassword && (
                <p className="text-xs text-stone-500 text-center mb-2">
                  กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่านนะจ๊ะ ✨
                </p>
              )}

              {isSignUp && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-[1.5rem] bg-white/50 border-4 border-white shadow-lg overflow-hidden cursor-pointer flex items-center justify-center group relative"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-stone-300">
                          <Camera className="w-6 h-6" />
                          <span className="text-[8px] font-bold uppercase mt-1">รูปโปรไฟล์</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera className="w-5 h-5" />
                      </div>
                    </motion.div>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">ชื่อเล่น</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                      <input 
                        type="text" 
                        required 
                        value={displayName} 
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-sans text-sm"
                        placeholder="ชื่อเล่นของคุณ"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {!isUpdatingPassword && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">อีเมล</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-sans text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              )}

              {(!isForgotPassword || isUpdatingPassword) && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {isUpdatingPassword ? 'รหัสผ่านใหม่' : 'รหัสผ่าน'}
                    </label>
                    {!isSignUp && !isUpdatingPassword && (
                      <button 
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                      >
                        ลืมรหัสผ่าน?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      type="password" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:outline-none focus:ring-4 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all font-sans text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <BouncyButton 
                type="submit" 
                disabled={authLoading}
                variant={isSignUp ? 'danger' : (isForgotPassword || isUpdatingPassword) ? 'secondary' : 'primary'}
                className="w-full py-4 mt-2"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    {(isForgotPassword || isUpdatingPassword) ? <Sparkles className="w-5 h-5" /> : isSignUp ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    {isUpdatingPassword ? 'บันทึกรหัสผ่านใหม่' : isForgotPassword ? 'ส่งลิงก์รีเซ็ต' : isSignUp ? 'สมัครเลยยย' : 'เข้าสู่ระบบ'}
                  </span>
                )}
              </BouncyButton>
            </form>

            <div className="mt-6 pt-4 border-t border-white/40 text-center">
              <button 
                onClick={() => {
                  if (isUpdatingPassword) {
                    setIsUpdatingPassword(false);
                  } else if (isForgotPassword) {
                    setIsForgotPassword(false);
                  } else {
                    setIsSignUp(!isSignUp);
                  }
                }}
                className="text-sm font-sans text-stone-500 hover:text-emerald-500 transition-colors"
              >
                {isUpdatingPassword ? 'ยกเลิกการตั้งรหัสใหม่' : isForgotPassword ? 'กลับไปหน้าเข้าสู่ระบบ' : isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิกใหม่'}
              </button>
            </div>
          </GlassCard>
        </AnimatePresence>
      </div>
    </div>
  );
};
