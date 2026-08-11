// POST /api/waste/diy-guide
// Generate AI-powered DIY composting guide based on waste type.
// Returns structured guide with steps, tips, and recommended plants.

import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback, DIY_GUIDE_PROMPT } from '@/lib/ai/provider';

interface DIYGuideRequest {
  waste_type: string;
  weight_kg?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: DIYGuideRequest = await request.json();

    const validWasteTypes = ['nasi', 'sayur', 'protein', 'buah', 'campuran', 'lainnya'];
    if (!body.waste_type || !validWasteTypes.includes(body.waste_type)) {
      return NextResponse.json(
        { error: 'INVALID_WASTE_TYPE', message: `Field "waste_type" must be one of: ${validWasteTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate prompt and call AI
    const prompt = DIY_GUIDE_PROMPT(body.waste_type, body.weight_kg);

    let guideText: string;
    let providerUsed: string;

    try {
      const { text, provider } = await generateTextWithFallback(prompt);
      guideText = text;
      providerUsed = provider;
    } catch (firstError) {
      // Retry once
      console.warn('[diy-guide] First attempt failed, retrying...', firstError);
      try {
        const { text, provider } = await generateTextWithFallback(prompt);
        guideText = text;
        providerUsed = provider;
      } catch (retryError) {
        console.error('[diy-guide] Retry also failed:', retryError);
        return NextResponse.json(
          {
            error: 'AI_ERROR',
            message: 'Failed to generate DIY guide after retry',
            details: retryError instanceof Error ? retryError.message : String(retryError),
          },
          { status: 500 }
        );
      }
    }

    console.log(`[diy-guide] Success via ${providerUsed}`);

    // Parse the AI response as JSON
    let parsed;
    try {
      parsed = parseGuideResponse(guideText);
    } catch (parseError) {
      console.error('[diy-guide] Failed to parse AI response:', parseError);
      // Return a fallback structured response instead of failing
      parsed = getFallbackGuide(body.waste_type);
    }

    return NextResponse.json({
      ...parsed,
      _meta: { ai_provider: providerUsed },
    });
  } catch (error) {
    console.error('[diy-guide] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function parseGuideResponse(raw: string) {
  let jsonStr = raw.trim();

  // Remove markdown code block if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // Validate required fields exist
  if (!parsed.guide || !parsed.guide.steps || !Array.isArray(parsed.guide.steps)) {
    throw new Error('Missing required guide.steps in AI response');
  }

  return {
    waste_type: parsed.waste_type || 'lainnya',
    guide: {
      title: parsed.guide.title || 'Panduan Kompos',
      steps: parsed.guide.steps,
      duration_days: parsed.guide.duration_days || 30,
      tips: parsed.guide.tips || [],
    },
    recommended_plants: parsed.recommended_plants || [],
  };
}

// Fallback guide if AI response can't be parsed — ensures demo always works
function getFallbackGuide(wasteType: string) {
  const guides: Record<string, { title: string; steps: string[]; duration_days: number; tips: string[]; plants: { name: string; reason: string }[] }> = {
    nasi: {
      title: 'Panduan Kompos dari Sisa Nasi',
      steps: [
        'Keringkan sisa nasi di bawah sinar matahari selama 1 hari',
        'Campurkan nasi kering dengan daun kering (rasio 1:3)',
        'Masukkan ke wadah kompos berlubang aerasi',
        'Tambahkan sedikit air sampai lembap',
        'Aduk setiap 3-4 hari sekali',
        'Kompos siap dalam 30-40 hari',
      ],
      duration_days: 35,
      tips: ['Hindari nasi yang banyak mengandung minyak', 'Jaga kelembapan seperti spons yang diperas'],
      plants: [
        { name: 'Kangkung', reason: 'Cocok dengan kompos yang kaya karbohidrat' },
        { name: 'Bayam', reason: 'Tumbuh cepat dengan pupuk organik' },
        { name: 'Selada', reason: 'Cocok untuk urban farming di pot kecil' },
      ],
    },
    sayur: {
      title: 'Panduan Kompos dari Sisa Sayuran',
      steps: [
        'Potong sisa sayuran menjadi ukuran kecil (2-3 cm)',
        'Siapkan wadah kompos dengan lubang aerasi',
        'Letakkan lapisan material kering setebal 5 cm',
        'Tambahkan sisa sayuran sebagai lapisan hijau',
        'Tutup dengan lapisan cokelat (material kering) lagi',
        'Semprot air hingga lembap dan aduk tiap 3-4 hari',
        'Kompos siap dalam 30-45 hari',
      ],
      duration_days: 35,
      tips: ['Rasio ideal: 3 bagian cokelat : 1 bagian hijau', 'Hindari sayuran berminyak'],
      plants: [
        { name: 'Kangkung', reason: 'Menyukai tanah kaya nitrogen dari kompos sayuran' },
        { name: 'Bayam', reason: 'Cocok dengan kompos sayur, panen dalam 25-30 hari' },
        { name: 'Tomat Cherry', reason: 'Responsif terhadap kompos organik' },
      ],
    },
  };

  const fallback = guides[wasteType] || guides['sayur']!;

  return {
    waste_type: wasteType,
    guide: {
      title: fallback.title,
      steps: fallback.steps,
      duration_days: fallback.duration_days,
      tips: fallback.tips,
    },
    recommended_plants: fallback.plants,
  };
}
