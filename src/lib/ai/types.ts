// CompozeIT – AI Provider Type Definitions

export interface ClassificationResult {
  waste_type: 'nasi' | 'sayur' | 'protein' | 'buah' | 'campuran' | 'lainnya';
  food_detail: string | null;
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
  "food_detail": "<nama makanan spesifik jika terlihat, atau null>",
  "estimated_weight_kg": <number>,
  "is_contaminated": <boolean>,
  "contaminant_type": "<plastik|logam|kaca|lainnya|null>",
  "is_food_waste": <boolean>,
  "confidence": <number 0-1>
}

Aturan ketat:
- Foto harus benar-benar menampilkan sisa makanan atau bahan organik yang akan dibuang. Jika foto berisi benda non-makanan, kemasan kosong, meja, manusia, atau objek yang tidak dapat dipastikan sebagai sampah makanan, set is_food_waste=false dan confidence maksimal 0.35.
- waste_type HARUS salah satu dari: nasi, sayur, protein, buah, campuran, lainnya. Donat, kue, roti, mi, dan makanan sejenis masuk lainnya, lalu tulis nama spesifiknya di food_detail. Pilih campuran hanya jika terlihat lebih dari satu kategori makanan.
- estimated_weight_kg dalam kilogram, estimasi visual yang konservatif. Jangan mengarang berat jika objek tidak terlihat jelas.
- is_contaminated=true jika ada material selain makanan/organik yang sedang dinilai tercampur. Batang, ranting, serpihan kayu, cabang, dan potongan keras non-makanan wajib ditandai sebagai kontaminasi lainnya, kecuali jelas merupakan bagian makanan (misalnya tulang). Periksa juga plastik transparan, kantong, bungkus, label, sedotan, kardus/kertas, logam, kaca, kain, atau cairan kimia; jangan abaikan material yang hanya terlihat sebagian.
- contaminant_type hanya boleh plastik, logam, kaca, atau lainnya. Gunakan lainnya untuk kardus/kertas, kain, kayu, tulang, cairan kimia, dan material asing lain.
- contaminant_type=null hanya jika is_contaminated=false. Jika makanan dan material asing terlihat bersamaan, is_food_waste tetap true tetapi kontaminasi wajib ditandai. confidence harus mencerminkan bukti visual (0-1). Untuk foto kompleks dengan banyak jenis makanan dan kemasan/material asing seperti sample 4, confidence maksimal 0.75. Turunkan confidence jika foto buram, terlalu jauh, atau objek tertutup.`;
