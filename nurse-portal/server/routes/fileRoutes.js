const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const authMiddleware = require('../middleware/authMiddleware');
const sendDownloadAlert = require('../utils/emailNotifier');
const DownloadLog = require('../models/DownloadLog');

const router = express.Router();

const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY; // Must be 32 chars
const IV_LENGTH = 16; // AES block size

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Encrypt helper
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]); // IV + encrypted data
}

// Decrypt helper
function decryptBuffer(buffer) {
  const iv = buffer.slice(0, IV_LENGTH);
  const encryptedText = buffer.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
}

// Upload route - encrypts file
router.post('/upload', authMiddleware, upload.single('document'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileBuffer = fs.readFileSync(req.file.path);
  const encryptedBuffer = encryptBuffer(fileBuffer);
  fs.writeFileSync(req.file.path, encryptedBuffer);

  res.status(200).json({
    message: 'File uploaded and encrypted successfully',
    filename: req.file.filename,
    uploadedBy: req.user.id,
    time: new Date()
  });
});

// List files route
router.get('/list', authMiddleware, (req, res) => {
  const dirPath = path.join(__dirname, '..', '..', 'uploads');

  fs.readdir(dirPath, (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to list files' });

    const fileList = files.map(file => ({
      name: file,
      url: `/uploads/${file}`
    }));

    res.status(200).json(fileList);
  });
});

// Download route - decrypts file, logs, sends email
router.get('/download/:filename', authMiddleware, async (req, res) => {
  const filePath = path.join(__dirname, '..', '..', 'uploads', req.params.filename);

  fs.readFile(filePath, async (err, encryptedData) => {
    if (err) return res.status(404).json({ error: 'File not found' });

    try {
      const decryptedData = decryptBuffer(encryptedData);

      res.setHeader('Content-Disposition', `attachment; filename=${req.params.filename}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(decryptedData);

      // Log download
      await DownloadLog.create({
        filename: req.params.filename,
        userId: req.user.id
      });

      // Send alert email
      sendDownloadAlert(req.params.filename, req.user.id);

    } catch (error) {
      res.status(500).json({ error: 'Decryption failed' });
    }
  });
});

module.exports = router;
