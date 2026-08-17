import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { generateCareSummary } from "@/lib/care.functions";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Add patient — Third Eye Care" },
      {
        name: "description",
        content: "Record a new patient and let the assistant review their medication needs.",
      },
      { property: "og:title", content: "Add patient — Third Eye Care" },
      { property: "og:description", content: "Create a patient record in seconds." },
    ],
  }),
  component: AddPatientPage,
});

const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  age: z.number().int().min(0).max(130).nullable(),
  gender: z.string().trim().max(30),
  conditions: z.string().trim().max(1000),
  allergies: z.string().trim().max(500),
  current_medications: z.string().trim().max(1000),
  notes: z.string().trim().max(1000),
});

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  conditions: string | null;
};

const emptyForm = {
  full_name: "",
  age: "",
  gender: "",
  conditions: "",
  allergies: "",
  current_medications: "",
  notes: "",
};

function AddPatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runSummary = useServerFn(generateCareSummary);
  const [form, setForm] = useState({ ...emptyForm });

  const patients = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, age, gender, conditions")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });

  const summarize = useMutation({
    mutationFn: async (patientId: string) => runSummary({ data: { patientId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("AI care summary ready.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "The AI assistant is unavailable."),
  });

  const deletePatient = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", patientId);
      if (error) throw error;
      return patientId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not delete this patient."),
  });

  const addPatient = useMutation({
    mutationFn: async () => {
      const parsed = patientSchema.parse({
        ...form,
        age: form.age.trim() === "" ? null : Number(form.age),
      });
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) throw new Error("Session expired. Please sign in again.");
      const { data, error } = await supabase
        .from("patients")
        .insert({ ...parsed, user_id: session.user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async (id) => {
      setForm({ ...emptyForm });
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient added. Generating care summary…");
      summarize.mutate(id);
      navigate({ to: "/assistant" });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not add this patient."),
  });

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <section className="bg-panel-gradient shadow-soft h-fit rounded-2xl border p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-4 w-4" /> Add a patient
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The assistant reviews each new record automatically.
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addPatient.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                maxLength={100}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={0}
                  max={130}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  maxLength={30}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="conditions">Conditions / symptoms</Label>
              <Textarea
                id="conditions"
                rows={2}
                maxLength={1000}
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                maxLength={500}
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="meds">Current medications</Label>
              <Input
                id="meds"
                maxLength={1000}
                value={form.current_medications}
                onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={addPatient.isPending} className="mt-1">
              {addPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add patient
            </Button>
          </form>
        </section>

        <section className="shadow-soft h-fit rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Recent patients</h2>
          {patients.isLoading ? (
            <p className="text-muted-foreground mt-3 text-sm">Loading…</p>
          ) : patients.data && patients.data.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {patients.data.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="bg-background flex items-center gap-3 rounded-xl border px-4 py-3"
                >
                  <UserRound className="text-primary h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{p.full_name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {[p.age ? `${p.age} yrs` : null, p.gender, p.conditions]
                        .filter(Boolean)
                        .join(" · ") || "No details recorded"}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${p.full_name}`}
                    disabled={deletePatient.isPending}
                    onClick={() => {
                      if (confirm(`Delete ${p.full_name}? This also removes their AI summaries.`)) {
                        deletePatient.mutate(p.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              No patients yet — add your first one on the left.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
