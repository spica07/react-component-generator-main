const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function callGoogle(prompt: string, apiKey: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }

  return (
    candidate?.content?.parts
      ?.map((part) => part.text)
      ?.join('') ?? ''
  );
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:jsx|tsx|javascript|typescript)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

function ensureRenderCall(code: string): string {
  if (/\brender\s*\(/.test(code)) return code;

  const match = code.match(/(?:const|function)\s+([A-Z]\w+)/);
  if (match) {
    return `${code}\n\nrender(<${match[1]} />);`;
  }
  return code;
}

async function callAnthropicStream(
  prompt: string,
  apiKey: string
): Promise<ReadableStream<string>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  return transformAnthropicStream(response.body!);
}

function transformAnthropicStream(
  body: ReadableStream<Uint8Array>
): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      try {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  type?: string;
                  delta?: { type?: string; text?: string };
                };
                if (
                  data.type === 'content_block_delta' &&
                  data.delta?.type === 'text_delta' &&
                  data.delta?.text
                ) {
                  controller.enqueue(data.delta.text);
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
          }
        }

        buffer += decoder.decode();
        if (buffer) {
          try {
            const data = JSON.parse(buffer.slice(6)) as {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            if (
              data.type === 'content_block_delta' &&
              data.delta?.type === 'text_delta' &&
              data.delta?.text
            ) {
              controller.enqueue(data.delta.text);
            }
          } catch {
            // Ignore
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function callGoogleStream(
  prompt: string,
  apiKey: string
): Promise<ReadableStream<string>> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  return transformGoogleStream(response.body!);
}

function transformGoogleStream(
  body: ReadableStream<Uint8Array>
): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      try {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  candidates?: Array<{
                    content?: {
                      parts?: Array<{ text?: string }>;
                    };
                    finishReason?: string;
                  }>;
                };

                if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
                  throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
                }

                data.candidates?.[0]?.content?.parts?.forEach((part) => {
                  if (part.text) {
                    controller.enqueue(part.text);
                  }
                });
              } catch (err) {
                if (err instanceof Error && err.message.includes('생성된 코드')) {
                  controller.error(err);
                }
              }
            }
          }
        }

        buffer += decoder.decode();
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6)) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            data.candidates?.[0]?.content?.parts?.forEach((part) => {
              if (part.text) {
                controller.enqueue(part.text);
              }
            });
          } catch {
            // Ignore
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const { prompt, apiKey, provider = 'anthropic', existingCode } = (await req.json()) as {
          prompt: string;
          apiKey?: string;
          provider?: Provider;
          existingCode?: string;
        };

        const resolvedKey = resolveApiKey(provider, apiKey);

        if (!resolvedKey) {
          return Response.json(
            { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        if (!prompt) {
          return Response.json(
            { error: 'Prompt is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const finalPrompt = existingCode
          ? `Here is an existing React component:\n\`\`\`\n${existingCode}\n\`\`\`\n\nModify it with this instruction: ${prompt}`
          : prompt;

        const text =
          provider === 'google'
            ? await callGoogle(finalPrompt, resolvedKey)
            : await callAnthropic(finalPrompt, resolvedKey);

        const code = ensureRenderCall(stripCodeFences(text));

        return Response.json({ code }, { headers: CORS_HEADERS });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (message.includes('503')) {
          return Response.json(
            { error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
            { status: 503, headers: CORS_HEADERS }
          );
        }

        if (message.includes('429')) {
          return Response.json(
            { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429, headers: CORS_HEADERS }
          );
        }

        return Response.json(
          { error: message },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/generate/stream') {
      try {
        const { prompt, apiKey, provider = 'anthropic', existingCode } = (await req.json()) as {
          prompt: string;
          apiKey?: string;
          provider?: Provider;
          existingCode?: string;
        };

        const resolvedKey = resolveApiKey(provider, apiKey);

        if (!resolvedKey) {
          return Response.json(
            { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        if (!prompt) {
          return Response.json(
            { error: 'Prompt is required' },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const finalPrompt = existingCode
          ? `Here is an existing React component:\n\`\`\`\n${existingCode}\n\`\`\`\n\nModify it with this instruction: ${prompt}`
          : prompt;

        const textStream =
          provider === 'google'
            ? await callGoogleStream(finalPrompt, resolvedKey)
            : await callAnthropicStream(finalPrompt, resolvedKey);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const reader = textStream.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const sseEvent = JSON.stringify({ type: 'delta', text: value });
                controller.enqueue(encoder.encode(`data: ${sseEvent}\n\n`));
              }
              const doneEvent = JSON.stringify({ type: 'done' });
              controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
              controller.close();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown error';
              const errorEvent = JSON.stringify({ type: 'error', message });
              controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (message.includes('503')) {
          return Response.json(
            { error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
            { status: 503, headers: CORS_HEADERS }
          );
        }

        if (message.includes('429')) {
          return Response.json(
            { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
            { status: 429, headers: CORS_HEADERS }
          );
        }

        return Response.json(
          { error: message },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);
