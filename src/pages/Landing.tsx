import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target } from "lucide-react";

const Landing = () => {
  // Fjern dialog og input state
  const [loading, setLoading] = useState(false);

  const { userProfile, signOut } = useAuth();
  const { toast } = useToast();

  // FK dialog state for helpful SQL fix when user row is missing
  const [fkDialogOpen, setFkDialogOpen] = useState(false);
  const [fkSql, setFkSql] = useState("");

  const buildFkSql = (userId: string | undefined, email?: string | null, companyId?: string | null) => {
    const uid = userId ?? "<user-uuid>";
    const mail = email ?? "seller@example.com";
    const orgId = companyId ?? null;

    const usersSql = `-- Create/ensure a minimal users row so pitches_sales FK succeeds\nBEGIN;\nINSERT INTO public.users (id, email, password, role_id, created_at) VALUES ('${uid}', '${mail}', 'temporary-password-please-change', 3, NOW()) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password, role_id = EXCLUDED.role_id;\nCOMMIT;`;

    let personsSql = "";
    if (orgId) {
      personsSql = `\n-- Optional: create a persons profile pointing at the auth user\nINSERT INTO public.persons (id, auth_user_id, organization_id, name, role, created_at) VALUES (gen_random_uuid(), '${uid}', ${orgId}, 'Seller Name', 'user', NOW()) ON CONFLICT (auth_user_id) DO NOTHING;`;
    } else {
      personsSql = `\n-- Optional: create a persons profile (replace <organization_id>)\nINSERT INTO public.persons (id, auth_user_id, organization_id, name, role, created_at) VALUES (gen_random_uuid(), '${uid}', <organization_id>, 'Seller Name', 'user', NOW()) ON CONFLICT (auth_user_id) DO NOTHING;`;
    }

    return usersSql + personsSql;
  };

  const handleCopyFkSql = async () => {
    try {
      await navigator.clipboard.writeText(fkSql);
      toast({ title: "SQL copied", description: "SQL is copied to clipboard. Paste it in Supabase SQL editor.", variant: "default" });
    } catch (err) {
      toast({ title: "Kunne ikke kopiere", description: "Copy failed — marker og kopier manuelt fra dialogen.", variant: "destructive" });
    }
  };

  const handleLogPitch = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // Insert directly into `pitches_sales` with explicit type
      // @ts-ignore
      const { error } = await (supabase as any)
        .from("pitches_sales")
        .insert({ user_id: userProfile.id, type: "pitch", created_at: new Date().toISOString() });
      if (error) {
        console.error("pitches_sales insert error", error);
        if (error.code === "23503") {
          // build helpful SQL to fix missing users row and open dialog
          const sql = buildFkSql(userProfile.id, (userProfile as any).email, (userProfile as any).company_id);
          setFkSql(sql);
          setFkDialogOpen(true);
          toast({ title: "Fejl: bruger mangler i DB", description: "Åbner SQL-forslag til at oprette brugeren (kopier og kør i Supabase SQL-editor).", variant: "destructive" });
          return;
        }
        throw error;
      }
      toast({ title: "Pitch logged!", description: `Pitch count increased by 1.` });
    } catch (error: any) {
      toast({
        title: "Error logging pitch",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogSale = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // Insert directly into `pitches_sales` with explicit type 'sale'
      // @ts-ignore
      const { error } = await (supabase as any)
        .from("pitches_sales")
        .insert({ user_id: userProfile.id, type: "sale", created_at: new Date().toISOString() });
      if (error) {
        console.error("pitches_sales insert error", error);
        if (error.code === "23503") {
          const sql = buildFkSql(userProfile.id, (userProfile as any).email, (userProfile as any).company_id);
          setFkSql(sql);
          setFkDialogOpen(true);
          toast({ title: "Fejl: bruger mangler i DB", description: "Åbner SQL-forslag til at oprette brugeren (kopier og kør i Supabase SQL-editor).", variant: "destructive" });
          return;
        }
        throw error;
      }
      toast({ title: "Sale logged!", description: `Sale count increased by 1.` });
    } catch (error: any) {
      toast({
        title: "Error logging sale",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-primary">
            Nordstack Pitch'nSales
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {userProfile?.name}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Velkommen til salgsoversigten</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Log pitches og salg hurtigt.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Button onClick={handleLogPitch} className="flex-1 h-16 text-lg font-medium" variant="outline" disabled={loading}>
                <Target className="mr-2 h-6 w-6" />
                Log pitch
              </Button>
            <Button
              onClick={handleLogSale}
              className="flex-1 h-16 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              <TrendingUp className="mr-2 h-6 w-6" />
              Log salg
            </Button>
          </div>
        </div>
      </main>

      {/* FK helper dialog */}
      <Dialog open={fkDialogOpen} onOpenChange={setFkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix: Opret manglende user-række</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">Systemet kan ikke finde en tilsvarende række i <span className="font-mono">users</span>. Kopier SQL'en nedenfor og kør den i Supabase SQL-editoren (Project -&gt; SQL).</p>
            <pre className="mt-3 p-3 bg-surface rounded-md text-sm overflow-auto max-h-64">
              {fkSql}
            </pre>
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setFkDialogOpen(false); }}>
                Luk
              </Button>
              <Button onClick={handleCopyFkSql}>
                Kopier SQL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs fjernet - nu kun klik */}
    </div>
  );
};

export default Landing;
