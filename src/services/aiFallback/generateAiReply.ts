export const AI_REPLY_MAX_LENGTH = 500;

export function buildAiFallbackPrompt() {
  return `You write one reply for a Korean anonymous worry-sharing app.
Requirements:
- Korean anonymous-user-style reply.
- Short, empathetic, 2-4 sentences.
- Use polite Korean tone.
- Do not frame yourself as a professional counselor.
- Do not diagnose, prescribe therapy, or use legal or medical authority tone.
- Return JSON only: { "content": "..." }`;
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export function parseAiReplyResponse(raw: unknown): { content: string } {
  const parsed = typeof raw === 'string' ? JSON.parse(stripCodeFence(raw)) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_ai_reply_json');
  const content = (parsed as { content?: unknown }).content;
  if (typeof content !== 'string') throw new Error('invalid_ai_reply_content');
  const trimmed = content.trim();
  if (!trimmed) throw new Error('empty_ai_reply_content');
  if (trimmed.length > AI_REPLY_MAX_LENGTH) throw new Error('too_long_ai_reply_content');
  return { content: trimmed };
}

export async function generateAiReply(params: {
  worryContent: string;
  fetchJson?: (systemInstruction: string, userContent: string) => Promise<unknown>;
}): Promise<{ content: string }> {
  const fetchJson = params.fetchJson ?? defaultFetchJson;
  return parseAiReplyResponse(await fetchJson(buildAiFallbackPrompt(), params.worryContent));
}

async function defaultFetchJson(systemInstruction: string, userContent: string): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not defined in .env file');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_completion_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}
