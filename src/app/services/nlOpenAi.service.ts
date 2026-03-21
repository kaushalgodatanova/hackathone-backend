import OpenAI from 'openai';
import { z } from 'zod';

import { AppError } from '../../utils/AppError';

const extractedSchema = z.object({
  lines: z.array(
    z.object({
      productHint: z.string().min(1),
      quantity: z.number().int().positive().max(99_999),
    }),
  ),
});

export type ExtractedLine = { productHint: string; quantity: number };

/**
 * Uses OpenAI to turn free text into product hints + quantities (English).
 * Does not assign product IDs — matching happens server-side on the catalog.
 */
export async function extractOrderLinesFromText(userMessage: string): Promise<ExtractedLine[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError('Natural language ordering is not configured (OPENAI_API_KEY).', 503);
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const openai = new OpenAI({ apiKey });

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
            'You extract wholesale order lines from the user message.',
            'Output a single JSON object with shape:',
            '{"lines":[{"productHint":"string","quantity":number}]}',
            'Rules:',
            '- productHint: what the user called the product (not an internal id).',
            '- quantity: positive integer.',
            '- English only.',
            '- If the user gives multiple items, include one object per distinct product.',
            '- If quantity is missing for an item, assume 1.',
            '- Ignore distributor names, pleasantries, and delivery notes.',
            '- If nothing to order, return {"lines":[]}.',
          ].join('\n'),
        },
        { role: 'user', content: userMessage },
      ],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'OpenAI request failed';
    throw new AppError(`Language model error: ${msg}`, 502);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new AppError('No response from language model', 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new AppError('Invalid JSON from language model', 502);
  }

  const validated = extractedSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AppError('Could not parse order from language model', 400);
  }

  return validated.data.lines;
}

const catalogChatSchema = z.object({
  reply: z.string(),
  orderLines: z
    .array(
      z.object({
        productHint: z.string().min(1),
        quantity: z.number().int().positive().max(99_999),
      }),
    )
    .optional(),
});

export type CatalogChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Q&A + optional order lines in one JSON response, grounded on catalog text.
 */
export async function catalogChatCompletion(
  messages: CatalogChatTurn[],
  catalogBlock: string,
): Promise<{ reply: string; orderLines: ExtractedLine[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError('Natural language ordering is not configured (OPENAI_API_KEY).', 503);
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const openai = new OpenAI({ apiKey });

  const systemContent = [
    'You help a wholesale retailer using ONLY the product catalog below.',
    'The catalog may be truncated — if you cannot verify, say so.',
    '',
    'CATALOG:',
    catalogBlock,
    '',
    'How to respond:',
    '- Answer questions (e.g. "Do you have whole milk?", "Any organic apples?") using only catalog lines. Mention product name, price, stock, and whether the line is available.',
    '- If nothing matches, say clearly it is not listed in this catalog.',
    '- If the user wants to ORDER with quantities, include those in orderLines: [{"productHint":"natural phrase","quantity":number}].',
    '- If the user only asks questions, use orderLines: [] or omit orderLines.',
    '- If they both ask and order, put the answer in reply and include orderLines for items to add.',
    '- reply: short, friendly plain text (no markdown fences).',
    '- Output JSON only: {"reply":"string","orderLines":[{"productHint":"...","quantity":1}]}',
    '- English only.',
  ].join('\n');

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemContent },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'OpenAI request failed';
    throw new AppError(`Language model error: ${msg}`, 502);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new AppError('No response from language model', 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new AppError('Invalid JSON from language model', 502);
  }

  const validated = catalogChatSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AppError('Could not parse assistant response', 400);
  }

  const orderLines = validated.data.orderLines ?? [];
  return { reply: validated.data.reply, orderLines };
}
