// CompozeIT – AI Provider Type Definitions

export interface ClassificationResult {
  waste_type: 'nasi' | 'sayur' | 'protein' | 'buah' | 'campuran' | 'lainnya';
  estimated_weight_kg: number;
  is_contaminated: boolean;
  contaminant_type: 'plastik' | 'logam' | 'kaca' | 'lainnya' | null;
  is_food_waste: boolean;
  confidence: number; // 0-1
}

export interface AIProvider {
  readonly name: string;
  classifyWaste(imageBase64: string): Promise<ClassificationResult>;
  generateText(prompt: string): Promise<string>;
}

// Prompt template for waste classification (combined classify + contamination)
export const CLASSIFICATION_PROMPT = `Analisis foto sampah makanan ini dan berikan output HANYA dalam format JSON (tanpa teks lain, tanpa markdown code block):
{
  "waste_type": "<nasi|sayur|protein|buah|campuran|lainnya>",
  "estimated_weight_kg": <number>,
  "is_contaminated": <boolean>,
  "contaminant_type": "<plastik|logam|kaca|lainnya|null>",
  "is_food_waste": <boolean>,
  "confidence": <number 0-1>
}

Aturan:
- waste_type HARUS salah satu dari: nasi, sayur, protein, buah, campuran, lainnya
- estimated_weight_kg dalam kilogram, estimasi visual
- is_contaminated: true jika ada material anorganik (plastik, logam, kaca) tercampur
- contaminant_type: null jika is_contaminated false
- is_food_waste: false jika foto bukan sampah makanan; jika sampah makanan bercampur plastik, kardus, logam, atau barang lain, tetap true dan tandai kontaminasi (gunakan tipe 'lainnya' bila materialnya tidak tersedia di daftar)
- confidence: seberapa yakin kamu dengan klasifikasi (0-1)`;
