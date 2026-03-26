const IMAGE_MIME_PREFIX = "image/";

const isImageMimeType = (mimeType) => {
  if (typeof mimeType !== "string") return false;
  return mimeType.toLowerCase().startsWith(IMAGE_MIME_PREFIX);
};

module.exports = {
  isImageMimeType,
};

