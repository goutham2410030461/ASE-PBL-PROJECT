import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { waitForSession } from "@/lib/session";
import { Activity, ClipboardPlus, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Third Eye Care — Patients + AI Medication Assistant" },
      {
        name: "description",
        content:
          "Add a patient and instantly get AI-reviewed medication suggestions, interaction checks and follow-up plans from global clinical guidance.",
      },
      { property: "og:title", content: "Third Eye Care" },
      {
        property: "og:description",
        content: "Patient records with an AI medication and care assistant.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: ClipboardPlus,
    title: "Add patients in seconds",
    body: "Name, age, conditions, allergies and current medications — one simple form, stored privately to your account.",
  },
  {
    icon: Sparkles,
    title: "AI care summary",
    body: "Each new patient is reviewed against global clinical guidance for medications, interactions, lifestyle advice and follow-ups.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Records are locked to your account. Only you can read, edit or delete the patients you create.",
  },
];

function Index() {
  const navigate = useNavigate();

  // Signed-in visitors (including a Google redirect landing here) skip the
  // marketing page and go straight to their workspace.
  useEffect(() => {
    let cancelled = false;
    waitForSession(1500).then((session) => {
      if (session && !cancelled) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <header className="bg-hero-gradient text-primary-foreground">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" /> Third Eye Care
          </span>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </nav>
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-24">
          <p className="text-primary-foreground/70 text-xs tracking-[0.2em] uppercase">
            Clinical assistant
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-semibold sm:text-5xl">
            Add a patient. Get their medication plan reviewed instantly.
          </h1>
          <p className="text-primary-foreground/85 mt-5 max-w-xl text-base leading-relaxed">
            Third Eye Care keeps your patient records in one place and pairs every record with an
            AI assistant that checks medications, allergies and interactions against widely
            published treatment guidelines.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="bg-panel-gradient shadow-soft rounded-2xl border p-6">
              <f.icon className="text-primary h-6 w-6" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>

        <p className="text-muted-foreground mt-12 text-center text-xs">
          Third Eye Care provides informational support only. A licensed clinician must confirm
          every prescription.
        </p>
      </main>
    </div>
  );
}
