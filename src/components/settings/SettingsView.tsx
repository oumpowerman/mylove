import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { ChevronLeft, Image as ImageIcon, Check, Upload, Loader2, Smartphone, Globe, Link as LinkIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { BouncyButton } from '../ui/BouncyButton';
import { GlassCard } from '../ui/GlassCard';
import { cn } from '@/src/lib/utils';
import { GoogleDriveService } from '@/src/services/googleDriveService';
import { supabase } from '@/src/lib/supabase';
import { Profile } from '@/src/types';

interface SettingsViewProps {
  key?: React.Key;
  profile: Profile;
  partner: Profile;
  onBack: () => void;
}

export const SettingsView = ({ profile, partner, onBack }: SettingsViewProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [uploadToGD, setUploadToGD] = useState(true);
  const [gdStatus, setGdStatus] = useState<'idle' | 'authenticating' | 'authenticated' | 'error'>(
    GoogleDriveService.isAuthenticated() ? 'authenticated' : 'idle'
  );
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Priority: Database (Mine) > Database (Partner) > LocalStorage > Default
    const savedIcon = profile.app_icon_url || partner?.app_icon_url || localStorage.getItem('honey_money_app_icon');
    if (savedIcon) {
      setCurrentIcon(savedIcon);
      updateAppIcons(savedIcon);
    }
  }, [profile.app_icon_url, partner?.app_icon_url]);

  const updateAppIcons = (url: string) => {
    // 1. Update Apple Touch Icon (iOS & many Android fallbacks)
    let appleLink = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = url;

    // 2. Update Standard Favicons (Android/Samsung/Browsers)
    const iconRels = ['icon', 'shortcut icon', 'fluid-icon'];
    iconRels.forEach(rel => {
      let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = url;
    });

    // 3. Update Windows/IE Tile (Used by some Android launchers)
    let msTile = document.querySelector("meta[name='msapplication-TileImage']") as HTMLMetaElement;
    if (!msTile) {
      msTile = document.createElement('meta');
      msTile.name = 'msapplication-TileImage';
      document.head.appendChild(msTile);
    }
    msTile.content = url;

    // 4. Dynamic Manifest for Android PWA (Chrome, Samsung Internet, Edge)
    const manifest = {
      name: "HoneyMoney | หารตังกับแฟน 💖",
      short_name: "HoneyMoney",
      description: "แอปหารค่าใช้จ่ายสำหรับคู่รัก ตะมุตะมิที่สุดในโลก",
      start_url: window.location.origin,
      display: "standalone",
      background_color: "#F5F5F0",
      theme_color: "#10B981",
      icons: [
        {
          src: url,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: url,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };
    
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (manifestLink) {
      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], {type: 'application/json'});
      const manifestUrl = URL.createObjectURL(blob);
      manifestLink.href = manifestUrl;
    }
  };

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

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Standard Apple Touch Icon size is 180x180, but we'll use 512x512 for high quality
    // while keeping base64 size manageable.
    const targetSize = 512;
    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetSize,
      targetSize
    );

    // Use jpeg with 0.8 quality to significantly reduce base64 size compared to png
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleSaveIcon = async () => {
    if (!image || !croppedAreaPixels) return;
    
    setSaving(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      let finalUrl = croppedImage;

      if (uploadToGD && GoogleDriveService.isAuthenticated()) {
        // Convert base64 to File object
        const res = await fetch(croppedImage);
        const blob = await res.blob();
        const file = new File([blob], "app_icon.png", { type: "image/png" });
        
        // Upload to GD
        finalUrl = await GoogleDriveService.uploadFile(file);
      }

      // Save to Supabase (so partner sees it too)
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ app_icon_url: finalUrl })
        .eq('id', profile.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        // If column is missing, we still want it to work locally
        if (dbError.code === 'PGRST204' || dbError.message.includes('column')) {
          console.warn('app_icon_url column might be missing in profiles table.');
        }
      }

      try {
        localStorage.setItem('honey_money_app_icon', finalUrl);
      } catch (e) {
        console.warn('LocalStorage quota exceeded, icon will only be saved to database.');
      }
      setCurrentIcon(finalUrl);
      updateAppIcons(finalUrl);
      setIsCropping(false);
      setImage(null);
      
      alert('บันทึกไอคอนเรียบร้อยแล้วจ้า! ✨ รูปถูกเก็บไว้ใน ' + (uploadToGD ? 'Google Drive' : 'เครื่องนี้') + ' เรียบร้อย');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปจ้า');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManualUrl = async () => {
    if (!manualUrl) return;
    setSaving(true);
    try {
      let finalUrl = manualUrl;
      
      // Auto-convert Google Drive links to direct image links
      const gdRegex = /(?:https?:\/\/)?(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/;
      const match = manualUrl.match(gdRegex);
      
      if (match && match[1]) {
        finalUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ app_icon_url: finalUrl })
        .eq('id', profile.id);

      if (dbError) {
        console.error('Database update error:', dbError);
      }

      try {
        localStorage.setItem('honey_money_app_icon', finalUrl);
      } catch (e) {
        console.warn('LocalStorage quota exceeded, icon will only be saved to database.');
      }
      setCurrentIcon(finalUrl);
      updateAppIcons(finalUrl);
      setShowManualInput(false);
      setManualUrl('');
      alert('บันทึกไอคอนจากลิงก์เรียบร้อยแล้วจ้า! ✨' + (finalUrl !== manualUrl ? ' (ระบบแปลงลิงก์ Google Drive ให้เป็นรูปภาพให้แล้วน้าา)' : ''));
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการบันทึกลิงก์จ้า');
    } finally {
      setSaving(false);
    }
  };

  const handleResetIcon = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ app_icon_url: null })
        .eq('id', profile.id);

      localStorage.removeItem('honey_money_app_icon');
      setCurrentIcon(null);
      
      const defaultIcon = 'https://cdn-icons-png.flaticon.com/512/802/802276.png';
      updateAppIcons(defaultIcon);
      alert('รีเซ็ตไอคอนเป็นค่าเริ่มต้นแล้วจ้า 🍯');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการรีเซ็ตจ้า');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-10"
    >
      <div className="flex items-center gap-4">
        <BouncyButton variant="ghost" onClick={onBack} className="p-2 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </BouncyButton>
        <h2 className="text-3xl font-display text-stone-800">ตั้งค่าแอป ✨</h2>
      </div>

      <GlassCard className="p-8 space-y-8 border-none">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                {currentIcon ? (
                  <img src={currentIcon} alt="App Icon" className="w-full h-full object-cover" />
                ) : (
                  <img src="https://cdn-icons-png.flaticon.com/512/802/802276.png" alt="Default Icon" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-400 text-white p-2 rounded-2xl shadow-lg border-2 border-white">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-display text-stone-800">ไอคอนแอปบนหน้าจอโฮม</h3>
              <p className="text-xs text-stone-400 font-sans mt-1 px-4">
                เปลี่ยนรูปไอคอนแอปเวลาคุณกด "Add to Home Screen" บน iPhone น้าา
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <BouncyButton 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-emerald-500 text-white flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" /> เลือกรูปและ Crop ✨
            </BouncyButton>

            <div className="flex items-center gap-2 px-2">
              <input 
                type="checkbox" 
                id="gd-upload"
                checked={uploadToGD}
                onChange={(e) => setUploadToGD(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="gd-upload" className="text-xs text-stone-500 font-sans cursor-pointer">
                อัปโหลดเข้า Google Drive (เพื่อให้แฟนเห็นด้วย)
              </label>
            </div>

            {uploadToGD && gdStatus !== 'authenticated' && (
              <button 
                onClick={handleConnectGD}
                className="w-full py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-colors"
              >
                {gdStatus === 'authenticating' ? 'กำลังเชื่อมต่อ...' : '🔗 เชื่อมต่อ Google Drive ก่อนน้าา'}
              </button>
            )}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-stone-100"></span></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-stone-300 bg-white px-2">หรือ</div>
            </div>

            {!showManualInput ? (
              <button 
                onClick={() => setShowManualInput(true)}
                className="w-full py-3 bg-stone-50 text-stone-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border border-stone-100 hover:bg-stone-100 transition-colors"
              >
                <LinkIcon className="w-4 h-4" /> ใส่ลิงก์รูปเอง (Public URL)
              </button>
            ) : (
              <div className="space-y-2">
                <input 
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="แปะลิงก์รูปตรงนี้เลยจ้า..."
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all font-sans text-sm"
                />
                <div className="flex gap-2">
                  <BouncyButton onClick={handleSaveManualUrl} disabled={saving || !manualUrl} className="flex-1 py-2 bg-emerald-400 text-white text-xs">
                    บันทึกลิงก์ ✨
                  </BouncyButton>
                  <BouncyButton onClick={() => setShowManualInput(false)} variant="ghost" className="px-4 py-2 text-stone-400 text-xs">
                    ยกเลิก
                  </BouncyButton>
                </div>
              </div>
            )}
            
            {currentIcon && (
              <button 
                onClick={handleResetIcon}
                className="w-full py-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest hover:text-rose-400 transition-colors"
              >
                รีเซ็ตเป็นไอคอนเริ่มต้น 🍯
              </button>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100 space-y-4">
          <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" /> วิธีเปลี่ยนไอคอนบนมือถือ:
          </h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">สำหรับ iPhone (iOS):</p>
              <ol className="text-xs text-stone-500 space-y-1 list-decimal list-inside font-sans">
                <li>เลือกรูปและกดบันทึกให้เรียบร้อย</li>
                <li>กดปุ่ม <span className="font-bold text-stone-700">Share</span> ใน Safari</li>
                <li>เลือก <span className="font-bold text-stone-700">"Add to Home Screen"</span></li>
              </ol>
            </div>
            <div className="space-y-2 border-t border-stone-200 pt-3">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">สำหรับ Android:</p>
              <ol className="text-xs text-stone-500 space-y-1 list-decimal list-inside font-sans">
                <li>เลือกรูปและกดบันทึกให้เรียบร้อย</li>
                <li>กดปุ่ม <span className="font-bold text-stone-700">จุด 3 จุด</span> มุมขวาบนของ Chrome</li>
                <li>เลือก <span className="font-bold text-stone-700">"Install app"</span> หรือ <span className="font-bold text-stone-700">"Add to Home screen"</span></li>
              </ol>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Cropper Modal */}
      {isCropping && image && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          <div className="relative flex-1">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="bg-white p-8 rounded-t-[3rem] space-y-6">
            <div className="space-y-2">
              <p className="text-center text-sm font-bold text-stone-400 uppercase tracking-widest">ปรับขนาดรูปให้พอดีน้าา</p>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="flex gap-4">
              <BouncyButton 
                variant="ghost" 
                onClick={() => {
                  setIsCropping(false);
                  setImage(null);
                }}
                className="flex-1 py-4 text-stone-400"
              >
                ยกเลิก
              </BouncyButton>
              <BouncyButton 
                onClick={handleSaveIcon}
                disabled={saving}
                className="flex-1 py-4 bg-emerald-500 text-white"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'บันทึกไอคอน ✨'}
              </BouncyButton>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
