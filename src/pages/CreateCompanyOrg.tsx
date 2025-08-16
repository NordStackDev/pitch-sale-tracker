import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";

/**
 * This component is shown to teamleads who are logged ind, but have no org/company yet.
 * It lets them create a company and org, and then updates their person row.
 */
export default function CreateCompanyOrg() {
  const { user, userProfile, fetchUserProfile } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      // 1. Opret company
      const companyId = uuidv4();
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: companyName, id: companyId }])
        .select()
        .single();
      if (companyError) {
        setError(
          "Company error: " +
            (companyError.message || JSON.stringify(companyError))
        );
        console.error("Company error:", companyError);
        return;
      }
      // 2. Opret org
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert([{ name: orgName, company_id: companyId }])
        .select()
        .single();
      if (orgError) {
        setError(
          "Organization error: " +
            (orgError.message || JSON.stringify(orgError))
        );
        console.error("Organization error:", orgError);
        return;
      }
      // 3. Opret eller opdater persons-row for denne bruger
      // Tjek om persons-række findes
      const { data: person, error: personFetchError } = await supabase
        .from("persons")
        .select("id")
        .eq("auth_user_id", user?.id)
        .maybeSingle();
      if (personFetchError) {
        setError(
          "Person fetch error: " +
            (personFetchError.message || JSON.stringify(personFetchError))
        );
        console.error("Person fetch error:", personFetchError);
        return;
      }
      if (!person) {
        // Opret persons-række
        const { error: personInsertError } = await supabase
          .from("persons")
          .insert([
            {
              auth_user_id: user?.id,
              name: userProfile?.name || "Teamlead",
              email: userProfile?.email || "",
              organization_id: org.id,
              role: "team_leader",
            },
          ]);
        if (personInsertError) {
          setError(
            "Person insert error: " +
              (personInsertError.message || JSON.stringify(personInsertError))
          );
          console.error("Person insert error:", personInsertError);
          return;
        }
      } else {
        // Opdater persons-række
        const { error: personUpdateError } = await supabase
          .from("persons")
          .update({ organization_id: org.id })
          .eq("auth_user_id", user?.id);
        if (personUpdateError) {
          setError(
            "Person update error: " +
              (personUpdateError.message || JSON.stringify(personUpdateError))
          );
          console.error("Person update error:", personUpdateError);
          return;
        }
      }
      setSuccess("Virksomhed og org oprettet! Org ID: " + org.id);
      fetchUserProfile(user?.id!); // Opdater context
    } catch (err: any) {
      setError("Uventet fejl: " + (err.message || JSON.stringify(err)));
      console.error("Uventet fejl:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        Opret virksomhed og organisation
      </h2>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <Label htmlFor="companyName">Virksomhedsnavn</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="orgName">Organisationens navn</Label>
          <Input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Opretter..." : "Opret virksomhed og org"}
        </Button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">{success}</div>}
      </form>
    </div>
  );
}
