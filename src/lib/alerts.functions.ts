import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  to: z.array(z.string().email()).min(1).max(20),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(20000),
  html: z.string().min(1).max(60000),
});

export const sendAnomalyAlert = createServerFn({ method: "POST" })
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["MAILJET_API_KEY"];
    const apiSecret = process.env["MAILJET_SECRET_KEY"];
    const fromEmail = process.env["MAILJET_FROM_EMAIL"];

    if (!apiKey || !apiSecret || !fromEmail) {
      return {
        sent: false,
        error:
          "Mailjet is not configured yet. Add MAILJET_API_KEY, MAILJET_SECRET_KEY and MAILJET_FROM_EMAIL.",
      };
    }

    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail, Name: "Anomaly Agent" },
            To: data.to.map((Email) => ({ Email })),
            Subject: data.subject,
            TextPart: data.text,
            HTMLPart: data.html,
          },
        ],
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`Mailjet send failed [${res.status}]: ${body}`);
      return { sent: false, error: `Mailjet rejected the request (${res.status}): ${body}` };
    }

    try {
      const json = JSON.parse(body);
      const msg = json.Messages?.[0];
      if (msg && msg.Status !== "success") {
        const errorMsg =
          msg.Errors?.map((e: { ErrorMessage?: string }) => e.ErrorMessage).filter(Boolean).join("; ") ||
          `Mailjet status: ${msg.Status}`;
        console.error("Mailjet delivery error:", json);
        return { sent: false, error: `Mailjet error: ${errorMsg}` };
      }
    } catch {
      /* ignore JSON parse failure */
    }

    return { sent: true, error: null as string | null };
  });

