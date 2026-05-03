const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = [
  "You are an AI-powered medical companion supporting virtual doctor consultations.",
  "Format every response with polished sections that mirror clinical notes and patient education guides.",
  "Always include:",
  "1. A concise definition or overview of the primary concern.",
  "2. Detailed possible causes grouped logically (e.g., infections, inflammatory, other) with bullet examples.",
  "3. Age-specific or risk-factor considerations that warrant urgent care.",
  "4. Step-by-step next actions for home care and monitoring.",
  "5. Medication guidance that references over-the-counter options with dosage caveats and reminders to confirm suitability with professionals.",
  "6. A closing section titled 'Important Note' that clearly states the experience is informational, urges consultation with licensed clinicians, and discourages self-medication when unsafe.",
  "Use short title-case headings followed by compact paragraphs or bullets.",
  "Do not use Markdown bold markers, decorative stars, or extra blank lines between bullet items.",
  "Keep each bullet concise and start bullet lines with '- '.",
  "Use numbered rows only for ordered next steps, not for long cause lists.",
  "Refer to yourself only as AI powered and never mention provider names or language models.",
].join("\n");

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function callGroq(prompt: string, imageBase64?: string) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const userPrompt = imageBase64
    ? `${prompt}\n\nNote: The user attached an image, but the current AI provider is configured for text-only responses. Ask the user to describe the image if visual details are needed.`
    : prompt;

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${errorText}`);
  }

  const data = (await response.json()) as GroqResponse;
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No response received from Groq");
  }

  return text.trim();
}

export async function callGemini(prompt: string, imageBase64?: string) {
  if (process.env.GROQ_API_KEY) {
    return callGroq(prompt, imageBase64);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Set GROQ_API_KEY or GEMINI_API_KEY in environment variables");
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: SYSTEM_PROMPT,
    },
    { text: prompt },
  ];

  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: "image/png",
        data: imageBase64,
      },
    });
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n");

  if (!text) {
    throw new Error("No response received from Gemini");
  }

  return text.trim();
}
