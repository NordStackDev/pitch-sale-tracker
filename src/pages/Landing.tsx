import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Target } from 'lucide-react';

const Landing = () => {
  const [showPitchDialog, setShowPitchDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [pitchValue, setPitchValue] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { userProfile, signOut } = useAuth();
  const { toast } = useToast();

  const handleLogPitch = async () => {
    if (!userProfile || !pitchValue) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pitches')
        .insert({
          user_id: userProfile.id,
          value: parseFloat(pitchValue),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Pitch logged successfully",
        description: `Pitch value: ${pitchValue} DKK`
      });
      
      setPitchValue('');
      setShowPitchDialog(false);
    } catch (error: any) {
      toast({
        title: "Error logging pitch",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogSale = async () => {
    if (!userProfile || !saleValue) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          user_id: userProfile.id,
          value: parseFloat(saleValue),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Sale logged successfully",
        description: `Sale value: ${saleValue} DKK`
      });
      
      setSaleValue('');
      setShowSaleDialog(false);
    } catch (error: any) {
      toast({
        title: "Error logging sale",
        description: error.message,
        variant: "destructive"
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
          <h1 className="text-2xl font-bold text-primary">Pitch'nSales</h1>
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
              onClick={() => setShowPitchDialog(true)}
              className="flex-1 h-16 text-lg font-medium"
              variant="outline"
            >
              <Target className="mr-2 h-6 w-6" />
              Log New Pitch
            </Button>
            
            <Button
              onClick={() => setShowSaleDialog(true)}
              className="flex-1 h-16 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <TrendingUp className="mr-2 h-6 w-6" />
              Log New Sale
            </Button>
          </div>
        </div>
      </main>

      {/* Pitch Dialog */}
      <Dialog open={showPitchDialog} onOpenChange={setShowPitchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Pitch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pitchValue">Pitch Value (DKK)</Label>
              <Input
                id="pitchValue"
                type="number"
                value={pitchValue}
                onChange={(e) => setPitchValue(e.target.value)}
                placeholder="Enter pitch value"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPitchDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleLogPitch}
                disabled={loading || !pitchValue}
              >
                {loading ? 'Logging...' : 'Log Pitch'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log New Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saleValue">Sale Value (DKK)</Label>
              <Input
                id="saleValue"
                type="number"
                value={saleValue}
                onChange={(e) => setSaleValue(e.target.value)}
                placeholder="Enter sale value"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSaleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleLogSale}
                disabled={loading || !saleValue}
              >
                {loading ? 'Logging...' : 'Log Sale'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;