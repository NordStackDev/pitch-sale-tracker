import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target } from "lucide-react";

const Landing = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile, signOut } = useAuth();
  const { toast } = useToast();

  const handleResetData = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const { error: pitchError } = await supabase
        .from("pitches")
        .delete()
        .eq("user_id", userProfile.id);
      const { error: salesError } = await supabase
        .from("sales")
        .delete()
        .eq("user_id", userProfile.id);
      if (pitchError || salesError) throw pitchError || salesError;
      toast({
        title: "Data reset!",
        description: "Alle dine pitches og sales er nu slettet.",
      });
    } catch (error: any) {
      toast({
        title: "Fejl ved reset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Returner noget simpelt for at undgå fejl
  return <div>Landing virker</div>;
};

export default Landing;
