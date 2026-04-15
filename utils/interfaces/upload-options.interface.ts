export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface UploadOptions {
  allowedMimes: string[];
  maxSize: number;
  destination: string;
  resize?: ResizeOptions;
}
