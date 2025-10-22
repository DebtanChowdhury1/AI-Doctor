const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function callGemini(prompt: string, imageBase64?: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        "You are an AI-powered medical companion supporting virtual doctor consultations.",
        "Format every response with polished sections that mirror clinical notes and patient education guides.",
        "Always include:",
        "1. A concise definition or overview of the primary concern.",
        "2. Detailed possible causes grouped logically (e.g., infections, inflammatory, other) with bullet examples.",
        "3. Age-specific or risk-factor considerations that warrant urgent care.",
        "4. Step-by-step next actions for home care and monitoring.",
        "5. Medication guidance that references over-the-counter options with dosage caveats and reminders to confirm suitability with professionals.",
        "6. A closing section titled 'Important Note' that clearly states the experience is informational, urges consultation with licensed clinicians, and discourages self-medication when unsafe.",
        "Use title-case headings, numbered checklists, and colon-based highlight rows where useful.",
        "Refer to yourself only as AI powered and never mention Gemini or language models.",
      ].join("\n"),
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
