const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../Database/database');
const { upload } = require('../utils/multer');
const { successResponse, errorResponse } = require('../utils/response');
const router = express.Router();

// File upload endpoint
router.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return errorResponse(res, err.message, 400);
    } else {
      if (req.file == undefined) {
        return errorResponse(res, 'Error: No file selected', 400);
      } else {
        // File details
        const originalName = req.file.originalname;
        const fileName = req.file.filename;
        const extension = path.extname(req.file.originalname).toLowerCase();
        const mimeType = req.file.mimetype;
        const size = req.file.size;
        try {
          // Save file metadata to the database
          const [result] = await pool.query(
            'INSERT INTO files (original_name, file_name, extension, mime_type, size) VALUES (?, ?, ?, ?, ?)',
            [originalName, fileName, extension, mimeType, size]
          );

          return successResponse(res, {
            id: result.insertId,
            originalName,
            fileName,
            extension,
            mimeType,
            size
          });
        } catch (err) {
          console.error(err);
          return errorResponse(res, err.message);
        }
      }
    }
  });
});

// File list endpoint with pagination
router.get('/:id', async (req, res) => {

  const id = req.params.id;
  if (!id) {
    return errorResponse(res, 'Id is required');
  }
  try {
    const [file] = await pool.query(`
    SELECT
     id,
     original_name originalName,
     file_name fileName,
     extension,
     mime_type mimeType,
     size,
     created_at createdAt,
     updated_at updatedAt
    FROM files WHERE id = ?`, [id]);
    successResponse(res, file);
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message);
  }
});

// File list endpoint with pagination
router.get('/list', async (req, res) => {
  const listSize = parseInt(req.query.list_size) || 10; // Default list size is 10
  const page = parseInt(req.query.page) || 1; // Default page number is 1

  const offset = (page - 1) * listSize;

  try {
    // Get total number of records
    const [totalRowsResult] = await pool.query('SELECT COUNT(*) as count FROM files');
    const totalRows = totalRowsResult[0].count;
    const totalPages = Math.ceil(totalRows / listSize);

    // Get paginated records
    const [files] = await pool.query(`
    SELECT
     id,
     original_name originalName,
     file_name fileName,
     extension,
     mime_type mimeType,
     size,
     created_at createdAt,
     updated_at updatedAt
    FROM files LIMIT ? OFFSET ?`, [listSize, offset]);

    successResponse(res, {
      page,
      listSize,
      totalPages,
      totalRows,
      files
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message);
  }
});

// Delete file endpoint
router.delete('/delete/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    // Check file if exists in database
    const [files] = await pool.query('SELECT file_name FROM files WHERE id = ?', [fileId]);

    if (!files.length) {
      return errorResponse(res, 'File not found', 404);
    }
    const fileName = files[0].file_name;
    const filePath = path.join(process.cwd(), '/public/uploads', fileName);

    // Delete the file from the local storage
    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, async (err) => {
      if (err) {
        console.error(err);
        return errorResponse(res, err.message, 404);
      }

      // Delete the file from the local storage
      fs.unlink(filePath, async (err) => {
        if (err) {
          console.error(err);
          return errorResponse(res, err.message, 500);
        }

        // Delete the file record from the database
        try {
          await pool.query('DELETE FROM files WHERE id = ?', [fileId]);
          successResponse(res, 'File deleted successfully');
        } catch (err) {
          console.error(err);
          return errorResponse(res, err.message, 500);
        }
      });
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message);
  }
});

// Update file endpoint
router.put('/update/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    // Get the current file information from the database
    const [files] = await pool.query('SELECT file_name FROM files WHERE id = ?', [fileId]);

    if (!files.length) {
      return errorResponse(res, 'File not found', 404);
    }

    const currentFileName = files[0].file_name;
    const currentFilePath = path.join(process.cwd(), '/public/uploads', currentFileName);

    // Upload the new file
    upload(req, res, async (err) => {
      if (err) {
        return errorResponse(res, err.message);
      }

      if (req.file === undefined) {
        return errorResponse(res, 'Error: No file selected');
      }

      const newFileName = req.file.filename;
      const newFilePath = req.file.path;
      const newFileSize = req.file.size;
      const newFileMimeType = req.file.mimetype;
      const newFileExtension = path.extname(req.file.originalname);

      // Delete the old file from local storage
      fs.unlink(currentFilePath, async (err) => {
        if (err) {
          console.error(err);
          return errorResponse(res, err.message);
        }

        // Update the database with new file information
        try {
          await pool.query(
            'UPDATE files SET file_name = ?, mime_type = ?, size = ?, extension = ?, updated_at = NOW() WHERE id = ?',
            [newFileName, newFileMimeType, newFileSize, newFileExtension, fileId]
          );

          successResponse(res, 'File updated successfully');
        } catch (err) {
          console.error(err);
          return errorResponse(res, err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    errorResponse(res, err.message);
  }
});

// Download file endpoint
router.get('/download/:id', async (req, res) => {
  const fileId = req.params.id;

  try {
    // Retrieve file information from the database
    const [files] = await pool.query('SELECT file_name, original_name FROM files WHERE id = ?', [fileId]);

    if (!files.length) {
      return errorResponse(res, 'File not found');
    }

    const fileName = files[0].file_name;
    const originalName = files[0].original_name;
    const filePath = path.join(process.cwd(), '/public/uploads', fileName);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(err);
        return errorResponse(res, 'File does not exist');
      }

      // Send the file as an attachment
      res.download(filePath, originalName, (err) => {
        if (err) {
          console.error(err);
          return errorResponse(res, err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, err.message);
  }
});

module.exports = router;

