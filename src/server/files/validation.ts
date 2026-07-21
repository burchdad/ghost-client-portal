const allowedMimeTypes = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/postscript",
  "application/illustrator",
  "application/octet-stream",
]);

const allowedExtensions = new Set([
  "svg",
  "png",
  "jpg",
  "jpeg",
  "pdf",
  "ai",
  "eps",
  "zip",
]);
const maxFileSizeBytes = 25 * 1024 * 1024;

export function validateClientUpload(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedExtensions.has(extension)) {
    throw new Error(`${file.name} is not an accepted file type.`);
  }

  if (file.type && !allowedMimeTypes.has(file.type)) {
    throw new Error(`${file.name} has an unsupported content type.`);
  }

  if (file.size > maxFileSizeBytes) {
    throw new Error(`${file.name} is larger than 25 MB.`);
  }

  return {
    name: file.name,
    mimeType: file.type || inferredMimeType(extension),
    sizeBytes: file.size,
    malwareScanStatus: "queued",
  };
}

export function shouldRenderFileInline(mimeType: string) {
  return mimeType !== "image/svg+xml";
}

function inferredMimeType(extension: string) {
  if (extension === "svg") return "image/svg+xml";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "pdf") return "application/pdf";
  if (extension === "zip") return "application/zip";
  return "application/octet-stream";
}
