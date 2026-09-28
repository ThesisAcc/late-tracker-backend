const express = require("express");
const multer = require('multer');
const XLSX = require("xlsx");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/excel", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded",
    });
  }

  const workbook = XLSX.read(req.file.buffer, {
    type: "buffer",
  });

  const result = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    result[sheetName] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
    });
  }

  return res.json({
    filename: req.file.originalname,
    sheets: workbook.SheetNames,
    data: result,
  });
});

module.exports = router;
