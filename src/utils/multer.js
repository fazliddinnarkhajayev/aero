const multer = require('multer');
const path = require('path');
// Set storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Specify the directory where uploaded files will be stored
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // Generate unique filename
  }
});

// Initialize multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 } // Limit file size (1MB in this example)
}).single('file'); // 'file' is the name attribute of the file input in the HTML form

module.exports = { upload }