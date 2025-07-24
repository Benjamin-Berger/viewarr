export interface Folder {
  name: string;
  path: string;
  file_count: number;
}

export interface Photo {
  name: string;
  path: string;
  type: 'image' | 'video';
  size: number;
  modified: number;
}

export interface PhotoResponse {
  folder: string;
  photos: Photo[];
  total_count: number;
}

export interface ApiError {
  detail: string;
} 