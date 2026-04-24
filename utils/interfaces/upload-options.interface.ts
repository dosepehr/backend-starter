export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface ConvertOptions {
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

export interface UploadOptions {
  allowedMimes: string[];
  maxSize: number;
  destination: string;
  resize?: ResizeOptions;
  convert?: ConvertOptions;
}
