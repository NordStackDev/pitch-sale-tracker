import { useState, useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target, Users, Plus, Copy } from "lucide-react";
import { Chart } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PointElement,
  LineElement,
  LineController,
  Title,
  ChartTooltip,
  ChartLegend
);

interface DashboardStats {
  totalPitches: number;
  totalSales: number;
  hitRate: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  pitches: number;
  sales: number;
  hitRate: number;
}

interface ChartData {
  date: string;
  sales: number;
  deals: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPitches: 0,
    totalSales: 0,
    hitRate: 0,
  });

  const [orgInfo, setOrgInfo] = useState<
    Database["public"]["Tables"]["companies"]["Row"] | null
  >(null);
  // Til kopier org-id feedback
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly"
  );
  const [loading, setLoading] = useState(true);

  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");

  const { userProfile, signOut } = useAuth();
  const { toast } = useToast();

  // Reset hele databasen (kun for teamleads)
  const handleResetDatabase = async () => {
    if (!userProfile || userProfile.role !== "team_leader") return;
    setLoading(true);
    try {
  const { error: err1 } = await supabase.from("pitches").delete().not("id", "is", null);
  const { error: err2 } = await supabase.from("sales").delete().not("id", "is", null);
  const error = err1 ?? err2;
      if (error) throw error;
      toast({
        title: "Database nulstillet!",
        description: "Alle pitches og sales er nu slettet.",
      });
      fetchDashboardData();
    } catch (error: any) {
            // @ts-ignore - demo types
      toast({
        title: "Fejl ved reset",
        description: error.message,
        variant: "destructive",
              // @ts-ignore
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchOrg = async () => {
      if (userProfile?.role === "team_leader" && userProfile.company_id) {
        // @ts-ignore - demo types
        const { data } = await (supabase as any)
          // @ts-ignore
          .from("companies")
          .select("id, name")
          .eq("id", userProfile.company_id)
          .maybeSingle();
        if (data) setOrgInfo(data as any);
      }
    };
    fetchOrg();
  }, [userProfile]);

  const fetchDashboardData = async () => {
    if (!userProfile || userProfile.role !== "team_leader") return;
    try {
      setLoading(true);
      // Fetch team members (persons) in the same company, fallback til users
      let teamMembers: any[] = [];
      try {
        // @ts-ignore - demo types
        const { data: tMembers, error: teamError } = await (supabase as any)
          .from("users")
          .select("id, name")
          .eq("company_id", userProfile.company_id) as any;
        if (teamError) throw teamError;
        teamMembers = tMembers || [];
      } catch (err: any) {
        teamMembers = [];
      }
      // Filtrér teamMembers på navn hvis der søges
      let filteredMembers = teamMembers;
      if (searchTerm.trim()) {
        filteredMembers = teamMembers.filter((entry) =>
          entry.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      const memberIds = filteredMembers.map((member: any) => member.id);
      // Read events fra pitches_sales for de filtrerede brugere
      let pitches: any[] = [];
      let sales: any[] = [];
      try {
        // @ts-ignore
        const { data: events, error: eventsError } = await (supabase as any)
          .from("pitches_sales")
          .select("*")
          .in("user_id", memberIds) as any;
        if (eventsError) {
          pitches = [];
          sales = [];
        } else {
          const rows = events || [];
          pitches = rows.filter((r: any) => String(r.type) === "pitch");
          sales = rows.filter((r: any) => String(r.type) === "sale");
        }
      } catch (err: any) {
        pitches = [];
        sales = [];
      }
      // Calculate stats for filtrerede brugere
      const totalPitches = pitches.length;
      const totalSales = sales.length;
      const hitRate = totalPitches > 0 ? Math.round((totalSales / totalPitches) * 100) : 0;
      setStats({ totalPitches, totalSales, hitRate });
      // Calculate leaderboard (stadig for hele teamet)
      const leaderboardData = teamMembers
        .map((member: any) => {
          const memberPitches = pitches.filter((p: any) => p.user_id === member.id).length;
          const memberSales = sales.filter((s: any) => s.user_id === member.id).length;
          const memberHitRate = memberPitches > 0 ? Math.round((memberSales / memberPitches) * 100) : 0;
          return {
            id: member.id,
            name: member.name,
            pitches: memberPitches,
            sales: memberSales,
            hitRate: memberHitRate,
          };
        })
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.hitRate - a.hitRate);
      setLeaderboard(leaderboardData);
      // Generate chart data (kun for filtrerede brugere)
      const chartDataTemp = generateChartData(pitches, sales, period);
      setChartData(chartDataTemp);
    } catch (error: any) {
      toast({
        title: "Error fetching dashboard data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (pitchesData: any[], salesData: any[], period: string): ChartData[] => {
    const now = new Date();
    const data: ChartData[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split("T")[0];
      const dayPitches = pitchesData.filter((p) => p.created_at?.slice(0, 10) === dateStr);
      const daySales = salesData.filter((s) => s.created_at?.slice(0, 10) === dateStr);

      data.push({
        date: date.toLocaleDateString(),
        sales: daySales.length,
        deals: dayPitches.length,
      });
    }

    return data;
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile, period]);

  useEffect(() => {
    if (!userProfile) return;

    const pitchesSubscription = supabase
      .channel("pitches-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pitches",
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const salesSubscription = supabase
      .channel("sales-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pitchesSubscription);
      supabase.removeChannel(salesSubscription);
    };
  }, [userProfile]);

  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tempPassword = `Tmp-${Math.random().toString(36).slice(2, 10)}`;
      const companyId = userProfile.company_id || null;
      // Opret auth user (signUp) med metadata inkl. company
      // @ts-ignore - demo types
      const { data: signData, error: signError } = await (supabase as any).auth.signUp({
        email: sellerEmail,
        password: tempPassword,
        options: { data: { name: sellerName, company_id: companyId, role: "user" } },
      });
      let authUserId: string | undefined = undefined;
      if (signError) {
        if (signError.message && signError.message.includes("already")) {
          toast({ title: "User exists", description: "Auth user already exists; ensuring profile row exists." });
        } else {
          throw signError;
        }
      } else {
        authUserId = signData?.user?.id;
      }
      // Upsert users-row med company_id og navn
      if (authUserId) {
        // @ts-ignore - demo types
        const { error: userInsertError } = await (supabase as any)
          .from("users")
          .upsert({
            id: authUserId,
            email: sellerEmail,
            password: tempPassword,
            name: sellerName,
            company_id: companyId,
            created_at: new Date().toISOString(),
          });
        if (userInsertError) {
          toast({ title: "Fejl ved users-oprettelse", description: userInsertError.message, variant: "destructive" });
          return;
        }
      }
      // Ensure persons row exists for denne auth user (med company)
      if (authUserId) {
        // @ts-ignore - demo types
        const { data: existingPerson } = await (supabase as any).from("persons").select("id").eq("auth_user_id", authUserId).maybeSingle();
        if (!existingPerson) {
          // Insert persons row manuelt
          // @ts-ignore - demo types
          const { error: perr } = await (supabase as any).from("persons").insert({ auth_user_id: authUserId, name: sellerName, email: sellerEmail, role: "user", company_id: companyId });
          if (perr) console.warn("Failed to insert person row:", perr.message ?? perr);
        }
      }
      const creds = `Email: ${sellerEmail}\nPassword: ${tempPassword}`;
      try {
        await navigator.clipboard.writeText(creds);
      } catch (err) {}
      toast({ title: "Seller created", description: "Credentials copied to clipboard" });
    } catch (error) {
      console.error("Error creating seller:", error);
      alert("Failed to create seller.");
    } finally {
      setLoading(false);
    }
  };

  // Kun teamleads må tilgå dashboard
  if (!userProfile || userProfile.role !== "team_leader") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <CardContent className="text-center">
            <h2 className="text-xl font-bold mb-2">Adgang nægtet</h2>
            <p className="text-muted-foreground">Kun teamleads kan se dashboardet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dynamisk graf-titel
  let chartTitle = "Pitch, Sales & Hit Rate (%) for Team";
  if (searchTerm.trim() && leaderboard.length === 1) {
    chartTitle = `Pitch, Sales & Hit Rate (%) for ${leaderboard[0].name}`;
  } else if (searchTerm.trim() && leaderboard.length > 1) {
    chartTitle = `Pitch, Sales & Hit Rate (%) for valgte brugere`;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-primary">Team Dashboard</h1>
            {orgInfo && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                Org: <span className="font-semibold">{orgInfo.name}</span> (
                <span className="font-mono">{orgInfo.id}</span>
                {copied && (
                  <span className="text-green-600 ml-1">Kopieret!</span>
                )}
                )
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {userProfile?.name} (Teamlead)
            </span>
            <Button variant="outline" onClick={signOut}>Log ud</Button>
            <Button variant="destructive" onClick={handleResetDatabase} disabled={loading}>
              Nulstil data
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total pitches</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPitches}</div>
              <p className="text-xs text-muted-foreground">
                Complete this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total salg</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">
                Complete this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Konverteringsrate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hitRate}%</div>
              <p className="text-xs text-muted-foreground">
                Sales conversion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Chart */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium mb-1">Periode</label>
            <Select
              value={period}
              onValueChange={(v) =>
                setPeriod(v as "daily" | "weekly" | "monthly")
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Dag</SelectItem>
                <SelectItem value="weekly">Uge</SelectItem>
                <SelectItem value="monthly">Måned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium mb-1">
              Søg teammedlem
            </label>
            <Input
              placeholder="Søg teammedlem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pitch, Sales & Hit Rate</CardTitle>
            <p className="text-sm text-muted-foreground">
              Udvikling af Pitch (rød), Sales (blå) og Hit Rate (%) (grøn) for
              teamet.
            </p>
          </CardHeader>
          <CardContent>
            <div style={{ maxWidth: 700, margin: "0 auto", height: 300 }}>
              <Chart
                type="bar"
                data={{
                  labels: chartData.map((d) => d.date),
                  datasets: [
                    {
                      type: "bar" as const,
                      label: "Pitch",
                      data: chartData.map((d) => d.deals),
                      backgroundColor: "rgba(255, 99, 132, 0.7)",
                      borderColor: "rgba(255, 99, 132, 1)",
                      borderWidth: 1,
                      borderRadius: 10,
                      yAxisID: "y",
                    },
                    {
                      type: "bar" as const,
                      label: "Sales",
                      data: chartData.map((d) => d.sales),
                      backgroundColor: "rgba(54, 162, 235, 0.7)",
                      borderColor: "rgba(54, 162, 235, 1)",
                      borderWidth: 1,
                      borderRadius: 10,
                      yAxisID: "y",
                    },
                    {
                      type: "line" as const,
                      label: "Hit Rate (%)",
                      data: chartData.map((d) =>
                        d.deals > 0 ? Math.round((d.sales / d.deals) * 100) : 0
                      ),
                      borderColor: "rgba(75, 192, 192, 1)",
                      backgroundColor: "rgba(75, 192, 192, 0.2)",
                      borderWidth: 2,
                      fill: false,
                      tension: 0.3,
                      yAxisID: "y1",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true },
                    title: {
                      display: true,
                      text: chartTitle,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: "Antal" },
                    },
                    y1: {
                      beginAtZero: true,
                      position: "right" as const,
                      title: { display: true, text: "Hit Rate (%)" },
                      grid: { drawOnChartArea: false },
                      min: 0,
                      max: 100,
                    },
                  },
                }}
                height={300}
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Team Leaderboard</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Top performers by deals won and total sales value.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLeaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index < 3 ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index < 3
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-medium">{entry.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Pitches:{" "}
                      <span className="font-medium">{entry.pitches}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Sales:{" "}
                      <span className="font-medium text-primary">
                        {entry.sales}
                      </span>
                    </span>
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      {entry.hitRate}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create Seller Form */}
        <section>
          <h2 className="text-xl font-bold">Create Seller</h2>
          <form onSubmit={handleCreateSeller} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellerName">Seller Name</Label>
              <Input
                id="sellerName"
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerEmail">Seller Email</Label>
              <Input
                id="sellerEmail"
                type="email"
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Seller"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
