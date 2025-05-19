'use strict';

export default function toArrayBuffer(base64Data) {
  // Detect environment: browser or Node.js
  const isBrowser = typeof window !== 'undefined' && typeof window.atob === 'function';

  let binary;
  if (isBrowser) {
    // Browser: Use atob to decode base64
    binary = window.atob(base64Data);
  } else {
    // Node.js: Use Buffer to decode base64
    binary = Buffer.from(base64Data, 'base64').toString('binary');
  }

  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}
