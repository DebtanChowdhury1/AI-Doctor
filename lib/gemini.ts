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
    { text: "You are an AI medical assistant. Analyze the user’s question or image and respond like a professional doctor with possible causes and next steps." },
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
