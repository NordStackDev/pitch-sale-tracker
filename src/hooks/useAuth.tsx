import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    userData: any
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "team_leader" | "seller" | "user";
  company_id: string | null;
  person_id?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      // First try persons table (this project uses persons/pitches/sales schema)
      // Try to read persons row; the DB trigger may take a moment, so retry a few times
      let personRow: any = null;
      let personErr: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        // @ts-ignore - demo types
        const res = await (supabase as any)
          .from("persons")
          .select("id, auth_user_id, name, email, role, organization_id")
          .eq("auth_user_id", userId)
          .maybeSingle();
        personRow = res.data;
        personErr = res.error;
        if (personErr) break;
        if (personRow) break;
        // wait 300ms before retrying
        await new Promise((r) => setTimeout(r, 300));
      }

      if (personErr) {
        console.warn("Error fetching person row:", personErr);
      }

      // If persons table not found in remote schema (PostgREST PGRST205), fallback to users table
      if (!personRow && personErr && String(personErr.message).includes("Could not find the table")) {
        try {
          // @ts-ignore
          const { data: udata, error: uerr } = await (supabase as any)
            .from("users")
            .select("id, name, email, role_id, company_id")
            .eq("id", userId)
            .maybeSingle();
          if (!uerr && udata) {
            const userRow = udata as any;
            let role: "team_leader" | "seller" | "user" = "user";
            if (userRow.role_id === 1) role = "team_leader";
            else if (userRow.role_id === 2) role = "seller";
            setUserProfile({ id: userId, name: userRow.name, email: userRow.email, role, company_id: userRow.company_id ?? null });
            return;
          }
        } catch (err) {
          console.warn("Fallback to users table failed", err);
        }
      }

      if (personRow) {
        // Resolve company_id via organizations table if possible
        let companyId: string | null = null;
        try {
          if (personRow.organization_id) {
            // @ts-ignore
            const { data: org } = await (supabase as any)
              .from("organizations")
              .select("company_id")
              .eq("id", personRow.organization_id)
              .maybeSingle();
            companyId = org?.company_id ?? null;
          }
        } catch (err) {
          console.warn("Failed to resolve organization -> company", err);
        }

        // Map role enum
        let role: "team_leader" | "seller" | "user" = "user";
        if (personRow.role === "team_leader") role = "team_leader";
        else if (personRow.role === "user") role = "seller"; // treat 'user' as seller in demo

        setUserProfile({
          id: userId,
          name: personRow.name,
          email: personRow.email,
          role,
          company_id: companyId,
          person_id: personRow.id,
        });
        return;
      }

      // Fallback: try to read role/company from auth user metadata if users row not present
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        const authUser = currentUser?.user as any | undefined;
        if (authUser) {
          const meta = authUser.user_metadata ?? authUser.userMetadata ?? {};
          let role: "team_leader" | "seller" | "user" = "user";
          if (meta.role_id === 1 || meta.role === "team_leader" || meta.role === "teamlead") role = "team_leader";
          else if (meta.role_id === 2 || meta.role === "seller") role = "seller";

          setUserProfile({
            id: authUser.id,
            name: authUser.user_metadata?.name ?? authUser.email ?? "",
            email: authUser.email ?? "",
            role,
            company_id: meta.company_id ?? null,
          });
        }
      } catch (err) {
        // ignore fallback errors
        console.warn("Fallback auth metadata read failed", err);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Defer profile fetch with setTimeout to prevent deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};