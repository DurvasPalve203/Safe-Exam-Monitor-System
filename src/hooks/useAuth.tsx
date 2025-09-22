import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  prn: string;
  vit_email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, prn: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  profileLoading: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  fetchProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async (currentSession?: Session | null) => {
    const sessionToUse = currentSession || session;
    if (!sessionToUse?.user?.id) return;

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', sessionToUse.user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one for existing users
        console.log('Profile not found, creating one...');
        await createProfileForUser(sessionToUse);
        return;
      }

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const createProfileForUser = async (currentSession?: Session | null) => {
    const sessionToUse = currentSession || session;
    if (!sessionToUse?.user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: sessionToUse.user.id,
          full_name: sessionToUse.user.user_metadata?.full_name || '',
          prn: sessionToUse.user.user_metadata?.prn || '',
          vit_email: sessionToUse.user.email || '',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data);
      toast({
        title: "Profile created",
        description: "Your profile has been set up successfully.",
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid auth state callback issues
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session);
          }, 100);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session);
        }, 100);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateVitEmail = (email: string, fullName: string) => {
    // Convert full name to expected VIT email format
    const nameParts = fullName.toLowerCase().split(' ');
    if (nameParts.length < 2) {
      return false;
    }
    
    const expectedEmail = `${nameParts[0]}.${nameParts[nameParts.length - 1]}24@vit.edu`;
    return email.toLowerCase() === expectedEmail;
  };

  const signUp = async (email: string, password: string, fullName: string, prn: string) => {
    try {
      // Validate VIT email format
      if (!validateVitEmail(email, fullName)) {
        return { 
          error: { 
            message: `Invalid VIT email format. Expected format: ${fullName.toLowerCase().split(' ')[0]}.${fullName.toLowerCase().split(' ').slice(-1)[0]}24@vit.edu` 
          } 
        };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            prn: prn,
          }
        }
      });

      if (error) {
        return { error };
      }

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      return { error: null };
    } catch (error) {
      console.error('Signin error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};