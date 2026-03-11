// ============================================
// Upload Controller
// ============================================
// Handles image uploads to Firebase Cloud Storage.
// Returns a public URL to store in Firestore.

const { bucket } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

/**
 * POST /api/upload/image
 *
 * Accepts multipart form data with field name "image".
 * Uploads to Cloud Storage under items/{uuid}.{ext}
 * Returns { success: true, imageUrl: "https://..." }
 */
const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No image file provided" });
  }

  try {
    const file = req.file;
    const ext = path.extname(file.originalname) || ".jpg";
    const fileName = `items/${uuidv4()}${ext}`;
    const blob = bucket.file(fileName);

    const token = uuidv4(); // access token for public URL

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    await new Promise((resolve, reject) => {
      blobStream.on("error", (err) => {
        console.error("❌ Upload stream error:", err);
        reject(err);
      });

      blobStream.on("finish", () => {
        resolve();
      });

      blobStream.end(file.buffer);
    });

    // Build public download URL
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;

    console.log(`✅ Image uploaded: ${fileName}`);

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ success: false, error: "Failed to upload image" });
  }
};

module.exports = { uploadImage };
