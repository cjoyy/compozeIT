// CompozeIT — AI Provider Type Definitions

export interface ClassificationResult {
  waste_type: 'nasi' | 'sayur' | 'protein' | 'buah' | 'campuran' | 'lainnya';
  estimated_weight_kg: number;
  is_contaminated: boolean;
  contaminant_type: 'plastik' | 'logam' | 'kaca' | 'lainnya' | null;
  confidence: number; // 0-1
}

export interface AIProvider {
  readonly name: string;
  classifyWaste(imageBase64: string): Promise<ClassificationResult>;
  generateText(prompt: string): Promise<string>;
}

export interface DIYGuideResponse {
  waste_type: string;
  guide: {
    title: string;
    steps: string[];
    duration_days: number;
    tips: string[];
  };
  recommended_plants: {
    name: string;
    reason: string;
  }[];
}

// Prompt template for waste classification (combined classify + contamination)
export const CLASSIFICATION_PROMPT = `Analisis foto sampah makanan ini dan berikan output HANYA dalam format JSON (tanpa teks lain, tanpa markdown code block):
{
  "waste_type": "<nasi|sayur|protein|buah|campuran|lainnya>",
  "estimated_weight_kg": <number>,
  "is_contaminated": <boolean>,
  "contaminant_type": "<plastik|logam|kaca|lainnya|null>",
  "confidence": <number 0-1>
}

Aturan:
- waste_type HARUS salah satu dari: nasi, sayur, protein, buah, campuran, lainnya
- estimated_weight_kg dalam kilogram, estimasi visual
- is_contaminated: true jika ada material anorganik (plastik, logam, kaca) tercampur
- contaminant_type: null jika is_contaminated false
- confidence: seberapa yakin kamu dengan klasifikasi (0-1)`;

// Prompt template for DIY compost guide
export const DIY_GUIDE_PROMPT = (wasteType: string, weightKg?: number) =>
  `Kamu adalah ahli kompos dan urban farming. Berikan panduan self-composting untuk sampah jenis "${wasteType}"${weightKg ? ` seberat ${weightKg} kg` : ''}.

Berikan output HANYA dalam format JSON (tanpa teks lain, tanpa markdown code block):
{
  "waste_type": "${wasteType}",
  "guide": {
    "title": "<judul panduan>",
    "steps": ["<langkah 1>", "<langkah 2>", ...],
    "duration_days": <estimasi hari>,
    "tips": ["<tip 1>", "<tip 2>", ...]
  },
  "recommended_plants": [
    {"name": "<nama tanaman>", "reason": "<alasan cocok>"},
    ...
  ]
}

Berikan 5-8 langkah, 2-3 tips, dan 3-4 rekomendasi tanaman. Gunakan bahasa Indonesia.`;
