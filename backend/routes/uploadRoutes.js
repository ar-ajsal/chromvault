const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (req.file && req.file.path) {
      res.status(200).send(req.file.path);
    } else {
      res.status(400).send({ message: 'No file uploaded' });
    }
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

router.post('/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (req.files && req.files.length > 0) {
      const urls = req.files.map(file => file.path);
      res.status(200).send(urls);
    } else {
      res.status(400).send({ message: 'No files uploaded' });
    }
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
