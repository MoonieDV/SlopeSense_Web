import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "8mb" }));

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;
  const adminApp = getApps()[0] ?? initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
  const adminAuth = getAdminAuth(adminApp);
  const supabase = createClient(process.env.VITE_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const bucket = process.env.SUPABASE_BUCKET || "incident-images";

  app.post("/api/incident-images", async (req, res) => {
    try {
      const authorization = req.header("authorization") ?? "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      const decoded = await adminAuth.verifyIdToken(token);
      const { reportId, mimeType, base64 } = req.body ?? {};
      if (!reportId || !base64 || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        res.status(400).json({ error: "A valid image and report ID are required." });
        return;
      }
      const data = Buffer.from(String(base64), "base64");
      if (data.length > 5 * 1024 * 1024) {
        res.status(413).json({ error: "Images must be 5 MB or smaller." });
        return;
      }
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const path = `incident-reports/${decoded.uid}/${reportId}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from(bucket).upload(path, data, { contentType: mimeType, upsert: false });
      if (upload.error) throw upload.error;
      const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Unable to create image URL");
      res.json({ path, url: signed.data.signedUrl });
    } catch (error) {
      console.error("Incident image upload failed", error);
      res.status(401).json({ error: "Unable to upload the incident image." });
    }
  });

  // Serve static files from dist/public
  const staticPath = fs.existsSync(path.resolve(__dirname, "public"))
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
