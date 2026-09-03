/**
 * Triggers safe browser download of a Blob or Object URL with a timestamped filename.
 */
export function downloadImageFile(objectUrlOrBlob: string | Blob, filename: string): void {
  let url = '';
  let shouldRevoke = false;

  if (typeof objectUrlOrBlob === 'string') {
    url = objectUrlOrBlob;
  } else {
    url = URL.createObjectURL(objectUrlOrBlob);
    shouldRevoke = true;
  }

  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    if (shouldRevoke) {
      URL.revokeObjectURL(url);
    }
  }, 1500);
}

/**
 * Formats bytes into clean human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
