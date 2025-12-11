const fileSizeLimitMB = 1024; // 1 GB in MB
const bulkFileSizeLimitMB = 10; // 10 MB

const allowedDocumentFileTypes = [
  "application/pdf", // PDF files
  "application/msword", // Word (.doc) files
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word (.docx) files
  "application/vnd.ms-excel", // Excel (.xls) files
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel (.xlsx) files
  "application/vnd.ms-powerpoint", // PowerPoint (.ppt) files
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint (.pptx) files
  "image/jpeg", // JPEG images
  "image/png", // PNG images
  "image/svg+xml", // SVG images
];

const allowedDocumentFileExtensions = [
  "pdf", // PDF files
  "doc", // Word (.doc) files
  "docx", // Word (.docx) files
  "xls", // Excel (.xls) files
  "xlsx", // Excel (.xlsx) files
  "ppt", // PowerPoint (.ppt) files
  "pptx", // PowerPoint (.pptx) files
  "jpg", // JPEG images
  "jpeg", // JPEG images
  "png", // PNG images
  "svg", // SVG images
];

const allowedVideoFileTypes = [
  "video/mp4", // MP4 video
  "video/webm", // WebM video
  "video/ogg", // OGG video
  "video/x-msvideo", // AVI video
  "video/x-matroska", // MKV video
  "video/quicktime", // MOV video
  "video/x-ms-wmv", // WMV video
  "video/x-flv", // FLV video
  "video/3gpp", // 3GP video
  "video/h265", // H265 (H.265/HEVC) video
  "video/mob", // MOB video (if supported)
];

const allowedVideoFileExtensions = [
  "mp4", // MP4 video
  "webm", // WebM video
  "ogv", // OGG video
  "avi", // AVI video
  "mkv", // MKV video
  "mov", // MOV video
  "wmv", // WMV video
  "flv", // FLV video
  "3gp", // 3GP video
  "h265", // H265 (H.265/HEVC) video
  "mob", // MOB video (if supported)
];

const allowedZipFileTypes = ["application/zip", "application/x-zip-compressed"];

const allowedZipFileExtensions = ["zip"];

const allowedImageFileTypes = [
  "image/jpeg", // JPEG images
  "image/png", // PNG images
  "image/gif", // GIF images
  "image/bmp", // BMP images
  "image/tiff", // TIFF images
  "image/webp", // WebP images
];

const allowedImageFileExtensions = [
  "jpg", // JPEG images
  "jpeg", // JPEG images
  "png", // PNG images
  "gif", // GIF images
  "bmp", // BMP images
  "tiff", // TIFF images
  "webp", // WebP images
];

const allowedSopFlowDocumentFileExtensions = [
  "pdf", // PDF files
];

const allowedBlankDocumentFileExtensions = [
  "doc", // Word (.doc) files
  "docx", // Word (.docx) files
];

module.exports = {
  bulkFileSizeLimitMB,
  fileSizeLimitMB,
  allowedDocumentFileTypes,
  allowedDocumentFileExtensions,
  allowedVideoFileTypes,
  allowedVideoFileExtensions,
  allowedZipFileTypes,
  allowedZipFileExtensions,
  allowedImageFileTypes,
  allowedImageFileExtensions,
  allowedSopFlowDocumentFileExtensions,
  allowedBlankDocumentFileExtensions,
};
