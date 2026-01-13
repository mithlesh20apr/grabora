/**
 * Image Optimizer Utility
 * 
 * Provides image compression and optimization functionality
 * to reduce file sizes before uploading.
 */

export interface ImageOptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  maxSizeMB?: number; // Maximum file size in MB
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<ImageOptimizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeMB: 2,
  outputFormat: 'jpeg',
};

/**
 * Compress and optimize a single image file
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    // Check file size before processing
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB <= opts.maxSizeMB && fileSizeMB < 1) {
      // If file is already small enough, return as is
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = Math.min(width, opts.maxWidth);
              height = width / aspectRatio;
            } else {
              height = Math.min(height, opts.maxHeight);
              width = height * aspectRatio;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with specified quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }

              // Check if compressed size is acceptable
              const compressedSizeMB = blob.size / (1024 * 1024);
              
              // If still too large, try with lower quality
              if (compressedSizeMB > opts.maxSizeMB && opts.quality > 0.5) {
                // Recursively call with lower quality
                const newOptions = { ...opts, quality: opts.quality - 0.1 };
                optimizeImage(file, newOptions)
                  .then(resolve)
                  .catch(reject);
                return;
              }

              // Create new file from blob
              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.\w+$/, `.${opts.outputFormat === 'jpeg' ? 'jpg' : opts.outputFormat}`),
                {
                  type: `image/${opts.outputFormat}`,
                  lastModified: Date.now(),
                }
              );

              resolve(optimizedFile);
            },
            `image/${opts.outputFormat}`,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Optimize multiple images
 */
export async function optimizeImages(
  files: File[],
  options: ImageOptimizeOptions = {}
): Promise<File[]> {
  const promises = files.map((file) => optimizeImage(file, options));
  return Promise.all(promises);
}

/**
 * Convert File to base64 data URL
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Convert multiple files to base64 data URLs
 */
export async function filesToDataURLs(files: File[]): Promise<string[]> {
  const promises = files.map((file) => fileToDataURL(file));
  return Promise.all(promises);
}

/**
 * Validate image file
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Check if it's a supported format
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedFormats.includes(file.type)) {
    return { valid: false, error: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF' };
  }

  return { valid: true };
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}
