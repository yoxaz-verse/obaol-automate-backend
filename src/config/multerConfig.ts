import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

// Define the uploads directory relative to the project root
const uploadDir = path.join(__dirname, "..", "..", "uploads");

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

// Create the Multer instance
const upload = multer({ storage });

export default upload;
