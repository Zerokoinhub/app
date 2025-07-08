const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

console.log('🔧 Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'NOT SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'NOT SET'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_screenshots',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File filter - File:', file.originalname, 'Type:', file.mimetype);

    // Check MIME type first
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }

    // If MIME type is not detected properly, check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedExtensions.includes(fileExtension)) {
      console.log('📁 File accepted based on extension:', fileExtension);
      cb(null, true);
    } else {
      console.log('📁 File rejected - Extension:', fileExtension, 'MIME:', file.mimetype);
      cb(new Error('Only image files (JPG, JPEG, PNG) are allowed!'), false);
    }
  }
});

module.exports = upload;