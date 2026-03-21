import OpenAI from 'openai';
import { z } from 'zod';

const planChoiceSchema = z.object({
  choiceId: z.enum(['A', 'B']),
  reason: z.string().min(1).max(500),
});

export type PlanSummary = { id: 'A' | 'B'; totalKm: number; utilizationPct: number };

/**
 * Option A: LLM picks between two fully feasible scored plans. Returns null on failure (caller falls back).
 */
export async function choosePlanWithAi(plans: PlanSummary[]): Promise<{ choiceId: 'A' | 'B'; reason: string } | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || plans.length < 2) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const openai = new OpenAI({ apiKey });

  const payload = {
    plans: plans.map((p) => ({
      id: p.id,
      totalKm: p.totalKm,
      utilizationPct: p.utilizationPct,
    })),
  };

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You choose the better delivery plan for a single milk-run.',
            'Plans A and B are both feasible (capacity OK).',
            'Prefer lower totalKm when similar; consider utilization.',
            'Reply with JSON only: {"choiceId":"A"|"B","reason":"short plain English"}',
          ].join('\n'),
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    });
  } catch {
    return null;
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const validated = planChoiceSchema.safeParse(parsed);
  if (!validated.success) return null;

  return { choiceId: validated.data.choiceId, reason: validated.data.reason };
}
