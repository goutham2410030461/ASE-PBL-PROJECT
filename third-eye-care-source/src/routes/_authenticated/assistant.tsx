import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Loader2, Search, Sparkles, Trash2, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { generateCareSummary } from "@/lib/care.functions";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI assistant — Third Eye Care" },
      {
        name: "description",
        content:
          "Browse patients and read AI-reviewed medication, interaction and follow-up guidance.",
      },
      { property: "og:title", content: "AI assistant — Third Eye Care" },
      {
        property: "og:description",
        content: "Medication and care guidance for every patient record.",
      },
    ],
  }),
  component: AssistantPage,
});

type Patient = {
  id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  conditions: string | null;
};

function AssistantPage() {
  const queryClient = useQueryClient();
  const runSummary = useServerFn(generateCareSummary);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  useEffect(() => {
    if (!selectedId && patients.data && patients.data.length > 0) {
      setSelectedId(patients.data[0]!.id);
    }
  }, [patients.data, selectedId]);

  const summary = useQuery({
    queryKey: ["summary", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_summaries")
        .select("content, created_at")
        .eq("patient_id", selectedId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.content ?? null;
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
    onSuccess: async (deletedId) => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      if (selectedId === deletedId) setSelectedId(null);
      toast.success("Patient deleted.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not delete this patient."),
  });

  const list = (patients.data ?? []).filter((p) =>
    `${p.full_name} ${p.conditions ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selected = patients.data?.find((p) => p.id === selectedId) ?? null;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="bg-panel-gradient shadow-soft h-fit rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">Patient browser</h2>
          <div className="relative mt-3">
            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              className="pl-9"
              placeholder="Search patients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {patients.isLoading ? (
            <p className="text-muted-foreground mt-4 text-sm">Loading…</p>
          ) : list.length > 0 ? (
            <ul className="mt-4 grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
              {list.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`hover:border-primary/50 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedId === p.id ? "border-primary bg-secondary" : "bg-background"
                    }`}
                  >
                    <UserRound className="text-primary h-4 w-4 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{p.full_name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {[p.age ? `${p.age} yrs` : null, p.gender, p.conditions]
                          .filter(Boolean)
                          .join(" · ") || "No details recorded"}
                      </span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete ${p.full_name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${p.full_name}? This also removes their AI summaries.`)) {
                          deletePatient.mutate(p.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          if (confirm(`Delete ${p.full_name}? This also removes their AI summaries.`)) {
                            deletePatient.mutate(p.id);
                          }
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">
              No patients found.{" "}
              <Link to="/dashboard" className="text-primary underline">
                Add a patient
              </Link>{" "}
              to get started.
            </p>
          )}
        </aside>

        <section className="shadow-soft rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="text-primary h-4 w-4" />
              {selected ? `Care guidance — ${selected.full_name}` : "AI care guidance"}
            </h2>
            {selected && (
              <Button
                size="sm"
                variant="outline"
                disabled={summarize.isPending}
                onClick={() => summarize.mutate(selected.id)}
              >
                {summarize.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerate
              </Button>
            )}
          </div>

          {!selected ? (
            <p className="text-muted-foreground mt-3 text-sm">
              Select a patient on the left to read their medication and care guidance.
            </p>
          ) : summarize.isPending || summary.isLoading ? (
            <p className="text-muted-foreground mt-3 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Reviewing global clinical guidance for{" "}
              {selected.full_name}…
            </p>
          ) : summary.data ? (
            <div className="prose-care mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.data}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              No summary yet — use Regenerate to create one.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}