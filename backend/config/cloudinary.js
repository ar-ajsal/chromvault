const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with the URL from environment variable
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chromora',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
