/** Trimmed Gemini API key from environment (avoids leading spaces in .env). */
export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}
