'use client';

import { useCallback, useEffect, useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { Upload, X, Camera, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  disabled?: boolean;
  className?: string;
  sampleUrl?: string | null;
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Format foto tidak didukung'));
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ onImageSelect, disabled, className, sampleUrl }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!sampleUrl) return;
    let cancelled = false;
    fetch(sampleUrl)
      .then((response) => response.blob())
      .then((blob) => compressImageFile(new File([blob], 'sample.jpg', { type: 'image/jpeg' })))
      .then((compressed) => {
        if (cancelled) return;
        setPreview(compressed);
        onImageSelect(compressed.split(',')[1] || '');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [onImageSelect, sampleUrl]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 25 * 1024 * 1024) {
        alert('Ukuran foto asli maksimal 25MB');
        return;
      }

      compressImageFile(file).then((result) => {
        setPreview(result);
        onImageSelect(result.split(',')[1] || '');
      }).catch((error: Error) => alert(error.message));
    },
    [onImageSelect]
  );

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setIsCameraOpen(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Kamera tidak dapat dibuka. Pastikan izin kamera diberikan dan halaman menggunakan HTTPS.');
    }
  };

  const captureCameraImage = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const result = canvas.toDataURL('image/jpeg', 0.78);
    setPreview(result);
    onImageSelect(result.split(',')[1] || '');
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setPreview(null);
    onImageSelect('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('w-full', className)}>
      {isCameraOpen ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full rounded-lg bg-black object-cover" />
          <div className="flex gap-2">
            <button type="button" onClick={captureCameraImage} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> Ambil foto</button>
            <button type="button" onClick={clearImage} className="rounded-lg border border-border px-3 py-2 text-sm">Tutup</button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
          {!disabled && (
            <button
              onClick={clearImage}
              aria-label="Hapus foto"
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-base"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Pilih foto sampah"
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={cn(
            'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-base',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            {isDragging ? (
              <Upload className="h-7 w-7 text-primary animate-bounce" />
            ) : (
              <Camera className="h-7 w-7 text-primary" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Lepaskan foto di sini' : 'Pilih atau tarik foto sampah'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Foto JPG, PNG, atau WebP – dikompresi otomatis
            </p>
          </div>
          <button type="button" onClick={(event) => { event.stopPropagation(); void openCamera(); }} disabled={disabled} className="inline-flex items-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            <Camera className="h-4 w-4" /> Buka kamera
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
