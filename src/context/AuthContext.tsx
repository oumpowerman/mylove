import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { GoogleDriveService } from '../services/googleDriveService';

interface AuthContextType {
  user: any;
  profile: Profile | null;
  partner: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<{ profile: Profile | null, partner: Profile | null }>;
  logout: () => Promise<void>;
  cancelLink: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pre-load Google Drive script
    if (GoogleDriveService.isConfigured()) {
      GoogleDriveService.init().catch(console.error);
    }
  }, []);

  const fetchPartner = useCallback(async (partnerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    if (data) {
      setPartner(data);
      return data;
    }
    return null;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
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
          
          if (!createError) {
            setProfile(newProfile);
            return { profile: newProfile, partner: null };
          }
        }
      } else if (data) {
        setProfile(data);
        let partnerData = null;
        if (data.partner_id) {
          partnerData = await fetchPartner(data.partner_id);
        }
        return { profile: data, partner: partnerData };
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
    return { profile: null, partner: null };
  }, [fetchPartner]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setPartner(null);
        setLoading(false);
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Real-time Profile & Partner Listeners
  useEffect(() => {
    let profileSubscription: any = null;
    let partnerSubscription: any = null;

    if (user?.id) {
      profileSubscription = supabase
        .channel(`profile_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const updatedProfile = payload.new as Profile;
            setProfile(updatedProfile);
            if (updatedProfile.partner_id) fetchPartner(updatedProfile.partner_id);
          }
        )
        .subscribe();
    }

    if (profile?.partner_id) {
      partnerSubscription = supabase
        .channel(`partner_${profile.partner_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${profile.partner_id}`,
          },
          (payload) => {
            setPartner(payload.new as Profile);
          }
        )
        .subscribe();
    }

    return () => {
      if (profileSubscription) supabase.removeChannel(profileSubscription);
      if (partnerSubscription) supabase.removeChannel(partnerSubscription);
    };
  }, [user?.id, profile?.partner_id, fetchPartner]);

  // Global App Icon Sync
  useEffect(() => {
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

    // 1. Initial load from LocalStorage (Fastest)
    const cachedIcon = localStorage.getItem('honey_money_app_icon');
    if (cachedIcon) {
      updateAppIcons(cachedIcon);
    }

    // 2. Load from Profile or Partner (Shared Icon)
    const effectiveIcon = profile?.app_icon_url || partner?.app_icon_url;
    
    if (effectiveIcon) {
      updateAppIcons(effectiveIcon);
      try {
        localStorage.setItem('honey_money_app_icon', effectiveIcon);
      } catch (e) {
        console.warn('LocalStorage quota exceeded in AuthContext sync');
      }
    } else if (profile && profile.app_icon_url === null && (!partner || partner.app_icon_url === null) && cachedIcon) {
      // Only reset if explicitly set to null in both (or partner is null)
      const defaultIcon = 'https://cdn-icons-png.flaticon.com/512/802/802276.png';
      updateAppIcons(defaultIcon);
      localStorage.removeItem('honey_money_app_icon');
    }
  }, [profile?.app_icon_url, partner?.app_icon_url, profile, partner]);
  const logout = async () => {
    await supabase.auth.signOut();
  };

  const cancelLink = async () => {
    if (!profile) return;
    await supabase
      .from('profiles')
      .update({ partner_id: null })
      .eq('id', profile.id);
    await fetchProfile(profile.id);
  };

  const refreshProfile = async () => {
    if (!user) return { profile: null, partner: null };
    return await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, partner, loading, refreshProfile, logout, cancelLink }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
