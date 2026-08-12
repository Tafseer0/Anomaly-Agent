import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  fileName: z.string(),
  latestDate: z.string(),
  anomalies: z.array(
    z.object({
      metric: z.string(),
      current: z.number(),
      baseline: z.number(),
      pctChange: z.number(),
      direction: z.enum(["up", "down"]),
      severity: z.enum(["critical", "warning", "normal"]),
      z: z.number(),
    }),
  ),
  allMetricsStats: z.array(
    z.object({
      metric: z.string(),
      current: z.number(),
      baseline: z.number(),
      pctChange: z.number(),
      z: z.number(),
    }),
  ),
});

export type AiInsightResult = {
  success: boolean;
  error: string | null;
  summary?: string;
  correlations?: string[];
  hiddenRisks?: string[];
  recommendations?: string[];
};

export const generateAiInsights = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AiInsightResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];

    if (!apiKey) {
      return {
        success: false,
        error:
          "GEMINI_API_KEY is not configured. Get a free key at https://aistudio.google.com/apikey and add GEMINI_API_KEY=your_key to your .env file.",
      };
    }

    const systemPrompt = `You are a Senior Business Data Analyst AI.
Analyze the following business metrics report for dataset "${data.fileName}" (Period: ${data.latestDate}).

Statistical Flagged Anomalies:
${
  data.anomalies.length > 0
    ? data.anomalies
        .map(
          (a) =>
            `- ${a.metric}: Current=${a.current}, Baseline=${a.baseline} (${a.pctChange > 0 ? "+" : ""}${a.pctChange.toFixed(1)}%, Z=${a.z.toFixed(2)}, ${a.severity.toUpperCase()})`,
        )
        .join("\n")
    : "No statistically flagged anomalies."
}

All Monitored Metrics Summary:
${data.allMetricsStats
  .map(
    (m) =>
      `- ${m.metric}: Current=${m.current}, Baseline=${m.baseline} (${m.pctChange > 0 ? "+" : ""}${m.pctChange.toFixed(1)}%, Z=${m.z.toFixed(2)})`,
  )
  .join("\n")}

Respond strictly in valid JSON format matching this schema:
{
  "summary": "High-level 2-sentence executive breakdown of what happened across all metrics.",
  "correlations": ["Cross-metric observation 1 (e.g. Traffic vs Conversion rate)", "Cross-metric observation 2"],
  "hiddenRisks": ["Potential secondary issue or trend to watch"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"]
}`;

    try {
      let res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      // Fallback to gemini-3.6-flash if gemini-3.5-flash hits an issue
      if (!res.ok) {
        const res2 = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          },
        );
        if (res2.ok) {
          res = res2;
        }
      }

      const bodyText = await res.text();

      if (!res.ok) {
        console.error(`Gemini API error [${res.status}]: ${bodyText}`);
        let apiErrorMsg = "";
        try {
          const errJson = JSON.parse(bodyText);
          apiErrorMsg = errJson.error?.message || bodyText;
        } catch {
          apiErrorMsg = bodyText;
        }

        if (res.status === 429) {
          return {
            success: false,
            error: `Rate limit / Quota exceeded (429): ${apiErrorMsg.slice(0, 180)}`,
          };
        }
        if (res.status === 403) {
          return {
            success: false,
            error: `Permission denied (403): ${apiErrorMsg.slice(0, 180)}`,
          };
        }
        return {
          success: false,
          error: `Gemini API error (${res.status}): ${apiErrorMsg.slice(0, 180)}`,
        };
      }

      const json = JSON.parse(bodyText);
      const textResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        return { success: false, error: "Empty response from Gemini AI model." };
      }

      // Gemini can emit extra prose, markdown fences, or trailing text around the JSON.
      // Robustly extract the outermost { ... } block so stray text is ignored entirely.
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: "AI returned a response with no valid JSON object. Try again.",
        };
      }
      const sanitized = jsonMatch[0]
        .replace(/,\s*([}\]])/g, "$1") // remove trailing commas
        .trim();

      const parsed = JSON.parse(sanitized);
      return {
        success: true,
        error: null,
        summary: parsed.summary || "",
        correlations: parsed.correlations || [],
        hiddenRisks: parsed.hiddenRisks || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (e: unknown) {
      console.error("AI Insight generation error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        error: `AI error: ${msg.slice(0, 200)}`,
      };
    }
  });

