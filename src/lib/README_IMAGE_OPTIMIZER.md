# Image Optimizer Utility

A reusable image optimization utility for the Grabora application that compresses and resizes images before upload.

## Features

- 🎨 **Smart Compression** - Automatically reduces file size while maintaining quality
- 📐 **Aspect Ratio Preservation** - Maintains original image proportions
- 🔄 **Format Conversion** - Converts images to optimized formats (JPEG, PNG, WebP)
- ✅ **Validation** - Built-in file type and size validation
- 📊 **Progress Tracking** - Returns promises for async handling
- 🔧 **Configurable** - Customizable quality, dimensions, and file size limits

## Installation

The utility is already included in `src/lib/imageOptimizer.ts`. No additional installation needed.

## Usage

### Basic Usage

```typescript
import { optimizeImage, optimizeImages } from '@/lib/imageOptimizer';

// Single image
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const optimizedFile = await optimizeImage(file);
    console.log('Original size:', file.size);
    console.log('Optimized size:', optimizedFile.size);
    // Use optimizedFile for upload
  } catch (error) {
    console.error('Optimization failed:', error);
  }
};

// Multiple images
const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  try {
    const optimizedFiles = await optimizeImages(files);
    // Use optimizedFiles for upload
  } catch (error) {
    console.error('Optimization failed:', error);
  }
};
```

### With Custom Options

```typescript
const optimizedFile = await optimizeImage(file, {
  maxWidth: 1200,      // Maximum width in pixels
  maxHeight: 1200,     // Maximum height in pixels
  quality: 0.85,       // Quality (0.0 - 1.0)
  maxSizeMB: 1,        // Maximum file size in MB
  outputFormat: 'jpeg' // Output format: 'jpeg' | 'png' | 'webp'
});
```

### Convert to Data URL (for preview)

```typescript
import { fileToDataURL, filesToDataURLs } from '@/lib/imageOptimizer';

// Single file
const dataUrl = await fileToDataURL(file);
setPreviewUrl(dataUrl);

// Multiple files
const dataUrls = await filesToDataURLs(files);
setPreviewUrls(dataUrls);
```

### Validation

```typescript
import { validateImageFile } from '@/lib/imageOptimizer';

const validation = validateImageFile(file, 10); // 10MB max
if (!validation.valid) {
  alert(validation.error);
  return;
}
```

### Get Image Dimensions

```typescript
import { getImageDimensions } from '@/lib/imageOptimizer';

const { width, height } = await getImageDimensions(file);
console.log(`Image size: ${width}x${height}`);
```

## API Reference

### `optimizeImage(file: File, options?: ImageOptimizeOptions): Promise<File>`

Optimizes a single image file.

**Parameters:**
- `file`: The image file to optimize
- `options`: Optional configuration object

**Returns:** Promise that resolves to optimized File

### `optimizeImages(files: File[], options?: ImageOptimizeOptions): Promise<File[]>`

Optimizes multiple image files.

**Parameters:**
- `files`: Array of image files to optimize
- `options`: Optional configuration object

**Returns:** Promise that resolves to array of optimized Files

### `fileToDataURL(file: File): Promise<string>`

Converts a file to base64 data URL.

**Parameters:**
- `file`: The file to convert

**Returns:** Promise that resolves to data URL string

### `filesToDataURLs(files: File[]): Promise<string[]>`

Converts multiple files to base64 data URLs.

**Parameters:**
- `files`: Array of files to convert

**Returns:** Promise that resolves to array of data URL strings

### `validateImageFile(file: File, maxSizeMB?: number): { valid: boolean; error?: string }`

Validates an image file.

**Parameters:**
- `file`: The file to validate
- `maxSizeMB`: Maximum file size in MB (default: 10)

**Returns:** Object with validation result and optional error message

### `getImageDimensions(file: File): Promise<{ width: number; height: number }>`

Gets the dimensions of an image file.

**Parameters:**
- `file`: The image file

**Returns:** Promise that resolves to object with width and height

## Configuration Options

```typescript
interface ImageOptimizeOptions {
  maxWidth?: number;        // Default: 1920
  maxHeight?: number;       // Default: 1920
  quality?: number;         // Default: 0.8 (0.0 - 1.0)
  maxSizeMB?: number;       // Default: 2
  outputFormat?: 'jpeg' | 'png' | 'webp'; // Default: 'jpeg'
}
```

## Example: Product Review Image Upload

```typescript
const [reviewForm, setReviewForm] = useState({
  rating: 5,
  title: '',
  review: '',
  images: [] as string[]
});
const [uploadingImages, setUploadingImages] = useState(false);

const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  if (files.length === 0) return;

  // Check limit
  const remainingSlots = 5 - reviewForm.images.length;
  if (files.length > remainingSlots) {
    alert(`You can only upload ${remainingSlots} more image(s).`);
    return;
  }

  // Validate
  for (const file of files) {
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
  }

  try {
    setUploadingImages(true);

    // Optimize
    const optimizedFiles = await optimizeImages(files, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      maxSizeMB: 1,
      outputFormat: 'jpeg',
    });

    // Convert to data URLs for preview
    const dataURLs = await filesToDataURLs(optimizedFiles);

    // Add to form
    setReviewForm(prev => ({
      ...prev,
      images: [...prev.images, ...dataURLs]
    }));

    e.target.value = '';
  } catch (error) {
    console.error('Error uploading images:', error);
    alert('Failed to upload images. Please try again.');
  } finally {
    setUploadingImages(false);
  }
};
```

## Supported Image Formats

- JPEG / JPG
- PNG
- WebP
- GIF

## Browser Compatibility

Works in all modern browsers that support:
- Canvas API
- FileReader API
- Blob API

## Performance Tips

1. **Use appropriate quality settings**: 0.8-0.85 is usually optimal
2. **Set reasonable dimensions**: Don't go higher than needed
3. **Batch processing**: Use `optimizeImages()` for multiple files
4. **Show loading indicators**: Optimization can take a few seconds
5. **Validate before optimization**: Check file size/type first

## Use Cases

- ✅ Product review image uploads
- ✅ Profile picture uploads
- ✅ Product image uploads (admin)
- ✅ Any user-uploaded images
- ✅ Gallery uploads
- ✅ Message attachments

## Error Handling

```typescript
try {
  const optimizedFile = await optimizeImage(file);
  // Success
} catch (error) {
  if (error instanceof Error) {
    switch (error.message) {
      case 'File is not an image':
        // Handle invalid file type
        break;
      case 'Failed to load image':
        // Handle corrupt image
        break;
      case 'Failed to create blob':
        // Handle processing error
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Notes

- Images are processed client-side for better UX and reduced server load
- Original files are never modified
- Recursive quality reduction ensures file size targets are met
- High-quality image smoothing is used for better results
