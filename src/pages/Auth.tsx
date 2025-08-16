import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
    // Fjernet rollevalg, signup på forsiden opretter altid teamlead
  // Fjernet organizationId og organizationName, bruges ikke
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          navigate("/landing");
        }
      } else {
        // Opret company hvis teamlead
        // Opret company hvis teamlead
          // Signup på forsiden opretter ALTID en teamlead (role_id=1)
          let companyId = uuidv4();
          const { error: companyError } = await supabase.from("companies").insert([{ name: companyName, id: companyId }]);
          if (companyError) {
            toast({
              title: "Fejl ved oprettelse af company",
              description: companyError.message,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          // Create an organization for this company (demo simplification)
          const orgId = uuidv4();
          const { error: orgError } = await supabase.from("organizations").insert([{ id: orgId, name: companyName, company_id: companyId }]);
          if (orgError) {
            toast({ title: "Fejl ved oprettelse af organisation", description: orgError.message, variant: "destructive" });
            setLoading(false);
            return;
          }

          // Create the auth user first so we get the auth user id. Include organization_id in metadata so the DB trigger can build the persons row.
          // @ts-ignore - demo types
          const { data: signData, error: signError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, organization_id: orgId, role: "team_leader" } },
          });

          if (signError) {
            console.error("Signup error:", signError);
            toast({ title: "Signup failed", description: signError.message, variant: "destructive" });
            setLoading(false);
            return;
          }

          const authUserId = signData?.user?.id;

          // Opret users-række for teamlead (så pitch/sale virker)
          if (authUserId) {
            // @ts-ignore - demo types
            await supabase.from("users").upsert({
              id: authUserId,
              email,
              name,
              password: password || 'temporary-password-please-change',
              company_id: companyId,
              created_at: new Date().toISOString(),
            });
          }

          // Wait briefly for DB trigger to create persons row; if not created, insert it manually
          // @ts-ignore
          let { data: personRow } = await supabase.from("persons").select("id").eq("auth_user_id", authUserId).maybeSingle();
          if (!personRow) {
            // @ts-ignore
            const { error: perr } = await supabase.from("persons").insert({ auth_user_id: authUserId, name, email, role: "team_leader", organization_id: orgId });
            if (perr) {
              console.warn("Could not insert persons row:", perr.message ?? perr);
            }
          }
          toast({ title: "Account created", description: "Tjek din mail for bekræftelse (hvis relevant)" });
      }
    } catch (error: any) {
      console.error("Signup exception:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Nordstack Pitch'nSales</CardTitle>
          <CardDescription>{isLogin ? "Log ind" : "Opret teamlead"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Navn</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Adgangskode</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Virksomhed</Label>
                  <Input id="companyName" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Virksomhedsnavn" required />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
