import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const explainRule = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ rule: z.string().max(8000) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { error: "AI explanation is not configured." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const openai = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
    try {
      const result = streamText({
        model: openai.responses("openai/gpt-6-astra"),
        system: "You explain debt-collection communication compliance rules to non-technical operations staff. Use plain, short sentences. Output exactly three short sections with these headings on their own lines: 'What it is', 'When it applies', 'What happens'. 1-3 sentences each. No legal advice, no markdown symbols besides the headings.",
        prompt: `Explain this rule configuration:\n${data.rule}`,
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
      });
      return { text: (await result.text).trim() };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) return { error: "Too many requests right now. Try again in a minute." };
      if (status === 402) return { error: "AI credits are used up. Add credits in Settings → Plans & credits." };
      return { error: "Could not generate an explanation right now." };
    }
  });
