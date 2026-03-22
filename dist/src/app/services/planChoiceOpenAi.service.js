"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.choosePlanWithAi = choosePlanWithAi;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const planChoiceSchema = zod_1.z.object({
    choiceId: zod_1.z.enum(['A', 'B']),
    reason: zod_1.z.string().min(1).max(500),
});
/**
 * Option A: LLM picks between two fully feasible scored plans. Returns null on failure (caller falls back).
 */
async function choosePlanWithAi(plans) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || plans.length < 2) {
        return null;
    }
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const openai = new openai_1.default({ apiKey });
    const payload = {
        plans: plans.map((p) => ({
            id: p.id,
            totalKm: p.totalKm,
            utilizationPct: p.utilizationPct,
        })),
    };
    let completion;
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
    }
    catch {
        return null;
    }
    const raw = completion.choices[0]?.message?.content;
    if (!raw)
        return null;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return null;
    }
    const validated = planChoiceSchema.safeParse(parsed);
    if (!validated.success)
        return null;
    return { choiceId: validated.data.choiceId, reason: validated.data.reason };
}
