// CompozeIT — AI Provider Abstraction Layer
// All AI calls MUST go through this module. Do NOT hardcode provider calls in route handlers.

import {
  AIProvider,
  ClassificationResult,
  CLASSIFICATION_PROMPT,
  DIY_GUIDE_PROMPT,
} from './types';

// ============================================================
// Ollama Provider
// ============================================================

class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_TUNNEL_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'moondream';
  }

  async classifyWaste(imageBase64: string): Promise<ClassificationResult> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: CLASSIFICATION_PROMPT,
        images: [imageBase64],
        stream: false,
        options: {
          temperature: 0.1, // Low temp for consistent JSON output
        },
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return parseClassificationResponse(data.response);
  }

  async generateText(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }
}

// ============================================================
// Gemini Provider
// ============================================================

class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    if (!this.apiKey) {
      console.warn('[GeminiProvider] GEMINI_API_KEY not set — provider will fail on use');
    }
  }

  async classifyWaste(imageBase64: string): Promise<ClassificationResult> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: CLASSIFICATION_PROMPT },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${errorBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return parseClassificationResponse(text);
  }

  async generateText(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${errorBody}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  }
}

// ============================================================
// Response Parser
// ============================================================

function parseClassificationResponse(raw: string): ClassificationResult {
  // Try to extract JSON from the response (handle markdown code blocks, extra text, etc.)
  let jsonStr = raw.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find JSON object in the text
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${raw.substring(0, 200)}`);
  }

  // Validate and normalize
  const validWasteTypes = ['nasi', 'sayur', 'protein', 'buah', 'campuran', 'lainnya'];
  const validContaminantTypes = ['plastik', 'logam', 'kaca', 'lainnya', null];

  const wasteType = String(parsed.waste_type || 'lainnya').toLowerCase();
  const contaminantType = parsed.contaminant_type
    ? String(parsed.contaminant_type).toLowerCase()
    : null;

  return {
    waste_type: validWasteTypes.includes(wasteType)
      ? (wasteType as ClassificationResult['waste_type'])
      : 'lainnya',
    estimated_weight_kg: Number(parsed.estimated_weight_kg) || 0,
    is_contaminated: Boolean(parsed.is_contaminated),
    contaminant_type: validContaminantTypes.includes(contaminantType)
      ? (contaminantType as ClassificationResult['contaminant_type'])
      : null,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
  };
}

// ============================================================
// Factory + Fallback Logic
// ============================================================

/**
 * Get the configured AI provider based on environment variables.
 * Falls back automatically if primary provider fails.
 */
export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER || 'ollama';
  if (providerName === 'gemini') {
    return new GeminiProvider();
  }
  return new OllamaProvider();
}

/**
 * Get the fallback AI provider (the one NOT selected as primary).
 */
function getFallbackProvider(): AIProvider | null {
  const providerName = process.env.AI_PROVIDER || 'ollama';
  if (providerName === 'gemini') {
    // If primary is Gemini, fallback to Ollama (only if tunnel URL is set)
    if (process.env.OLLAMA_TUNNEL_URL) {
      return new OllamaProvider();
    }
    return null;
  }
  // If primary is Ollama, fallback to Gemini (only if API key is set)
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider();
  }
  return null;
}

/**
 * Classify waste with automatic fallback.
 * Tries primary provider first, then fallback if primary fails.
 */
export async function classifyWasteWithFallback(
  imageBase64: string
): Promise<{ result: ClassificationResult; provider: string }> {
  const primary = getAIProvider();
  try {
    const result = await primary.classifyWaste(imageBase64);
    return { result, provider: primary.name };
  } catch (primaryError) {
    console.error(`[AI] Primary provider (${primary.name}) failed:`, primaryError);

    const fallback = getFallbackProvider();
    if (!fallback) {
      throw new Error(
        `Primary AI provider (${primary.name}) failed and no fallback is configured. ` +
          `Error: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
      );
    }

    console.log(`[AI] Trying fallback provider: ${fallback.name}`);
    try {
      const result = await fallback.classifyWaste(imageBase64);
      return { result, provider: `${fallback.name} (fallback)` };
    } catch (fallbackError) {
      throw new Error(
        `Both AI providers failed. ` +
          `Primary (${primary.name}): ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. ` +
          `Fallback (${fallback.name}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      );
    }
  }
}

/**
 * Generate text with automatic fallback.
 */
export async function generateTextWithFallback(
  prompt: string
): Promise<{ text: string; provider: string }> {
  const primary = getAIProvider();
  try {
    const text = await primary.generateText(prompt);
    return { text, provider: primary.name };
  } catch (primaryError) {
    console.error(`[AI] Primary provider (${primary.name}) failed:`, primaryError);

    const fallback = getFallbackProvider();
    if (!fallback) {
      throw new Error(
        `Primary AI provider (${primary.name}) failed and no fallback is configured. ` +
          `Error: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`
      );
    }

    console.log(`[AI] Trying fallback provider: ${fallback.name}`);
    try {
      const text = await fallback.generateText(prompt);
      return { text, provider: `${fallback.name} (fallback)` };
    } catch (fallbackError) {
      throw new Error(
        `Both AI providers failed. ` +
          `Primary (${primary.name}): ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. ` +
          `Fallback (${fallback.name}): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
      );
    }
  }
}

// Re-export types
export type { ClassificationResult, AIProvider } from './types';
export { DIY_GUIDE_PROMPT } from './types';
