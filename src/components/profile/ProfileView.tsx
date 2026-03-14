import React, { useState } from 'react';
import { Profile } from '@/src/types';
import { GlassCard } from '../ui/GlassCard';
import { BouncyButton } from '../ui/BouncyButton';
import { ChevronLeft, LogOut, User, Heart, Edit2, Check, X, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { GoogleDriveService } from '@/src/services/googleDriveService';
import { cn } from '@/src/lib/utils';

export const ProfileView = ({ profile, partner, onLogout, onBack }: { key?: React.Key, profile: Profile, partner: Profile, onLogout: () => void, onBack: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gdStatus, setGdStatus] = useState<'idle' | 'authenticating' | 'authenticated' | 'error'>(
    GoogleDriveService.isAuthenticated() ? 'authenticated' : 'idle'
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleConnectGD = async () => {
    setGdStatus('authenticating');
    try {
      await GoogleDriveService.authenticate();
      setGdStatus('authenticated');
    } catch (err: any) {
      console.error('GD Auth Error:', err);
      setGdStatus('error');
      alert(err.message || 'ไม่สามารถเชื่อมต่อ Google Drive ได้');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!GoogleDriveService.isAuthenticated()) {
      alert('กรุณาเชื่อมต่อ Google Drive ก่อนอัปโหลดน้าา');
      return;
    }

    setUploading(true);
    try {
      // Upload to Google Drive
      const directUrl = await GoogleDriveService.uploadFile(file);
      
      // 3. Update state
      setAvatarUrl(directUrl);
      
      // 4. Save to Supabase immediately if not in editing mode, 
      // or wait for handleSave if in editing mode.
      // For better UX, let's just update the state and let them save if they are editing,
      // or save immediately if they just clicked the camera icon.
      if (!isEditing) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: directUrl })
          .eq('id', profile.id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl || null
        })
        .eq('id', profile.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BouncyButton variant="ghost" onClick={onBack} className="p-2 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </BouncyButton>
          <h2 className="text-3xl font-display text-stone-800">โปรไฟล์ ✨</h2>
        </div>
        {!isEditing && (
          <BouncyButton 
            variant="ghost" 
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-full text-emerald-500 hover:bg-emerald-50"
          >
            <Edit2 className="w-5 h-5" />
          </BouncyButton>
        )}
      </div>

      <GlassCard className="p-10 space-y-10 border-none">
        <div className="flex flex-col items-center text-center">
          <div className="relative group">
            <motion.div 
              whileHover={{ rotate: [0, -10, 10, 0] }}
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={cn(
                "w-32 h-32 bg-gradient-to-br from-pastel-pink to-rose-200 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-display mb-6 shadow-xl shadow-rose-100 border-4 border-white overflow-hidden relative",
                isEditing && "cursor-pointer"
              )}
            >
              {uploading ? (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                displayName?.charAt(0).toUpperCase() || <User className="w-12 h-12" />
              )}
            </motion.div>
            {isEditing && !uploading && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-4 right-0 w-10 h-10 bg-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform"
              >
                <Camera className="w-5 h-5" />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full space-y-4"
              >
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">ชื่อเล่น</label>
                  <input 
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all font-sans text-sm"
                    placeholder="ชื่อของคุณ"
                  />
                </div>
                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-2">ลิงก์รูปโปรไฟล์ (URL)</label>
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
                            type="button"
                            onClick={handleConnectGD}
                            className="text-[9px] text-rose-400 font-bold uppercase tracking-widest hover:underline"
                          >
                            Link Google Drive 🔗
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input 
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all font-sans text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <BouncyButton 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-500 text-white"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> บันทึก</>}
                  </BouncyButton>
                  <BouncyButton 
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(profile.display_name || '');
                      setAvatarUrl(profile.avatar_url || '');
                    }}
                    className="px-4 py-3 text-stone-400"
                  >
                    <X className="w-5 h-5" />
                  </BouncyButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className="text-3xl font-display text-stone-800">{profile?.display_name || 'คุณ'}</h3>
                <p className="text-stone-400 font-sans text-sm">{profile?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-white/40 rounded-[2rem] border border-white/60 relative overflow-hidden">
            <Heart className="absolute -right-4 -bottom-4 w-20 h-20 text-rose-100/50 fill-current" />
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 font-sans">เชื่อมต่อกับหวานใจ</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-300 text-xl font-display shadow-sm border border-rose-50 overflow-hidden">
                {partner?.avatar_url ? (
                  <img 
                    src={partner.avatar_url} 
                    alt={partner?.display_name || ''} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  partner?.display_name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-display text-xl text-stone-800">{partner?.display_name || 'แฟน'}</p>
                <p className="text-[10px] font-bold text-stone-300 font-sans uppercase tracking-tighter">สถานะ: รักกันดีม้ากกก</p>
              </div>
            </div>
          </div>
        </div>

        <BouncyButton 
          variant="danger"
          onClick={onLogout}
          className="w-full py-5 text-xl"
        >
          <LogOut className="w-6 h-6" /> ออกจากระบบน้าา
        </BouncyButton>
      </GlassCard>
    </motion.div>
  );
};
