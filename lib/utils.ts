import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = text.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch (error) {
    console.error("Failed to parse JSON from AI response", error);
    return null;
  }
}
