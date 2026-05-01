const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const saveToLocal = async (file, filename) => {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const localPath = path.join(uploadDir, filename);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/${filename}`;
};

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'patrioticng',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

const uploadImage = async (file) => {
  try {
    const result = await uploadToCloudinary(file);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      fallback: false,
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error.message);
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    const localUrl = await saveToLocal(file, filename);
    return {
      url: localUrl,
      public_id: filename,
      fallback: true,
    };
  }
};

module.exports = { uploadImage, cloudinary };