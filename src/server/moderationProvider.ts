import { WORRY_CATEGORIES } from '@midnight-radio/domain';

export const MODERATION_PROVIDER = 'openai';
export const MODERATION_MODEL = 'gpt-5.4-mini';

async function fetchFromOpenAI(systemInstruction: string, userContent: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined in .env file');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODERATION_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_completion_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API Error: ${response.status}`);
  }

  const data = await response.json();
  let textContent = data.choices?.[0]?.message?.content || '{}';
  if (textContent.includes('```')) {
    textContent = textContent.replace(/```json|```/g, '').trim();
  }

  return JSON.parse(textContent);
}

export async function moderateAndInferWorryCategories(content: string, strictRetry = false): Promise<unknown> {
  const systemInstruction = `You are a moderator and category inference engine for a Korean anonymous worry-sharing app.
Use ONLY this fixed category vocabulary:
${WORRY_CATEGORIES.join(', ')}

Decision policy:
1. Reject ONLY when the text itself is inappropriate, abusive, violent, sexually explicit, hateful, or obvious spam.
   In that case, return exactly:
   { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }

2. Otherwise, the text is considered acceptable and MUST be approved.

3. For approved text, return the best category labels from the fixed vocabulary above.

4. If category inference is uncertain, choose exactly ["잡담"].

5. Never include explanations, markdown, or extra text.
6. Return JSON only.
7. Approved shape must be exactly:
   { "status": "approved", "categories": ["카테고리1", "카테고리2"] }
${strictRetry ? '8. This is a retry because the previous answer had invalid JSON or invalid shape. Return valid JSON only.' : ''}`;

  return fetchFromOpenAI(systemInstruction, content);
}
