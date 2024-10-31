import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use the uploads directory from .env or set a default value
const uploadDir =
  process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");

// Ensure that the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the dynamic directory path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex"); // Generate a unique filename
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`); // Maintain the original file extension
  },
});

// Create the Multer instance with optional limits
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Validate the file type
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Only JPEG, PNG, and PDF files are allowed."
        )
      );
    }
  },
});

export default upload;
