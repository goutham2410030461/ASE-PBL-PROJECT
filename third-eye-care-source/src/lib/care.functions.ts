import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PatientInput = z.object({
  patientId: z.string().uuid(),
});

export const generateCareSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PatientInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: patient, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", data.patientId)
      .single();

    if (error || !patient) throw new Error("Patient not found");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");

    const prompt = [
      `Patient name: ${patient.full_name}`,
      `Age: ${patient.age ?? "unknown"}`,
      `Gender: ${patient.gender ?? "unknown"}`,
      `Known conditions: ${patient.conditions || "none recorded"}`,
      `Allergies: ${patient.allergies || "none recorded"}`,
      `Current medications: ${patient.current_medications || "none recorded"}`,
      `Clinical notes: ${patient.notes || "none"}`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a clinical decision-support assistant drawing on widely published international treatment guidelines (WHO, NICE, AHA, ADA). For the patient described, produce a full care summary in clean markdown with these sections, in this order: '## Suggested Medications' (a markdown table with columns Medication | Typical Dose | Purpose), '## Drug & Allergy Interactions', '## Lifestyle Guidance', '## Follow-up Checks'. Be specific and concise. Never invent history that was not given. End with a short bold disclaimer that this is informational guidance and a licensed clinician must confirm every prescription.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
    if (!res.ok) throw new Error("The AI assistant could not complete this request.");

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("The AI assistant returned an empty response.");

    await supabase.from("care_summaries").insert({
      patient_id: patient.id,
      user_id: userId,
      content,
    });

    return { content };
  });