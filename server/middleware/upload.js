const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/banners'));
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(12).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const bannerFileFilter = (req, file, cb) => {
  const allowedImage = /\.(jpg|jpeg|png|gif|webp)$/i;
  const allowedVideo = /\.(mp4|webm|ogg|mov)$/i;
  const allowedMime = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|ogg|quicktime))$/;

  if ((allowedImage.test(file.originalname) || allowedVideo.test(file.originalname)) && allowedMime.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, GIF, WebP) أو فيديو (MP4, WebM).'), false);
  }
};

const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: bannerFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/chat'));
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(12).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const chatFileFilter = (req, file, cb) => {
  const allowedExt = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx)$/i;
  const allowedMime = /^(image\/(jpeg|png|gif|webp)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel))$/;

  if (allowedExt.test(file.originalname) && allowedMime.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة أو ملف PDF أو Word أو Excel.'), false);
  }
};

const uploadChat = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = { uploadBanner, uploadChat };
