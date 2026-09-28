const DEFAULT_GEMINI_MODEL = 'google/gemini-3.5-flash-lite' as const;

export const geminiModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
