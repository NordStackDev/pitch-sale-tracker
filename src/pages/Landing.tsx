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

  const handleLogPitch = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("pitches").insert({
        user_id: userProfile.id,
        value: 1,
        date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      toast({
        title: "Pitch logged!",
        description: `Pitch count increased by 1.`,
      });
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
      const { error } = await supabase.from("sales").insert({
        user_id: userProfile.id,
        value: 1,
        date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      toast({
        title: "Sale logged!",
        description: `Sale count increased by 1.`,
      });
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
            <h2 className="text-3xl font-bold">Welcome to Your Sales Hub!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Access key insights or log new opportunities quickly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Button
              onClick={handleLogPitch}
              className="flex-1 h-16 text-lg font-medium"
              variant="outline"
              disabled={loading}
            >
              <Target className="mr-2 h-6 w-6" />
              Log Pitch
            </Button>
            <Button
              onClick={handleLogSale}
              className="flex-1 h-16 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              <TrendingUp className="mr-2 h-6 w-6" />
              Log Sale
            </Button>
          </div>
        </div>
      </main>

      {/* Dialogs fjernet - nu kun klik */}
    </div>
  );
};

export default Landing;
