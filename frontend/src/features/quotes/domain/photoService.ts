export async function preparePhotosForUpload(files: File[]) {
  const prepared: File[] = [];
  for (const file of files) prepared.push(await optimizePhoto(file));
  const totalBytes = prepared.reduce((total, file) => total + file.size, 0);
  if (totalBytes > 75 * 1024 * 1024) {
    throw new Error('The optimized photos exceed the 75 MB limit for one submission.');
  }
  return prepared;
}

async function optimizePhoto(file: File) {
  const compressibleTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!compressibleTypes.has(file.type) || typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}
