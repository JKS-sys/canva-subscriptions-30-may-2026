const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const multer = require("multer");
const XLSX = require("xlsx");
const crypto = require("crypto");

// 🔐 Read the expected hash from .env (never sent to browser)
const EXPECTED_PASSWORD_HASH = process.env.PASSWORD_HASH;

if (!EXPECTED_PASSWORD_HASH) {
  console.error("FATAL: PASSWORD_HASH is not set in .env");
  process.exit(1);
}

// 🔧 Firebase Admin – validate service account JSON before parsing
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!rawServiceAccount) {
  console.error("FATAL: FIREBASE_SERVICE_ACCOUNT is empty");
  process.exit(1);
}
try {
  JSON.parse(rawServiceAccount);
} catch (e) {
  console.error(
    "FATAL: FIREBASE_SERVICE_ACCOUNT is not valid JSON. It starts with:",
    rawServiceAccount.substring(0, 100),
  );
  process.exit(1);
}
const serviceAccount = JSON.parse(rawServiceAccount);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const subscriptionsCollection = db.collection("subscriptions");
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Suppress favicon 404
app.get("/favicon.ico", (req, res) => res.sendStatus(204));

app.use(express.static(path.join(__dirname, "public")));

// Middleware – compute hash from plain password & compare with .env hash
function requirePassword(req, res, next) {
  const plainPassword = req.headers["x-password"];
  if (!plainPassword) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const hash = crypto.createHash("sha256").update(plainPassword).digest("hex");
  if (hash !== EXPECTED_PASSWORD_HASH) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.use("/api", requirePassword);

// ---------- API Routes ----------
app.get("/api/subscriptions", async (req, res) => {
  try {
    const snapshot = await subscriptionsCollection.orderBy("name").get();
    const entries = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      entries.push({
        name: d.name,
        email: d.email,
        firstEntryDate: d.firstEntryDate.toDate().toISOString(),
        reUploadCount: d.reUploadCount,
      });
    });
    res.json(entries);
  } catch (error) {
    console.error("❌ Error in GET /api/subscriptions:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text" });
    const newPairs = parseNameEmailPairs(text);
    if (!newPairs.length)
      return res.status(400).json({ error: "No valid pairs" });

    const snapshot = await subscriptionsCollection.select("email").get();
    const existingEmails = new Set();
    snapshot.forEach((doc) => existingEmails.add(doc.id));

    const now = new Date();
    const batch = db.batch();
    for (const pair of newPairs) {
      if (!existingEmails.has(pair.email)) {
        batch.set(subscriptionsCollection.doc(pair.email), {
          name: pair.name,
          email: pair.email,
          firstEntryDate: admin.firestore.Timestamp.fromDate(now),
          reUploadCount: 0,
        });
      }
    }
    await batch.commit();

    for (const pair of newPairs) {
      if (existingEmails.has(pair.email)) {
        const docRef = subscriptionsCollection.doc(pair.email);
        await db.runTransaction(async (t) => {
          const doc = await t.get(docRef);
          if (doc.exists) {
            t.update(docRef, {
              reUploadCount: (doc.data().reUploadCount || 0) + 1,
            });
          }
        });
      }
    }
    const updated = await getAllEntries();
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/import", multer().single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (json.length < 2) return res.status(400).json({ error: "Empty file" });

    const headers = json[0].map((h) => h.toString().trim().toLowerCase());
    const ni = headers.indexOf("name");
    const ei = headers.indexOf("email");
    const di = headers.indexOf("date of entry");
    const ci = headers.indexOf("re-upload count");
    if ([ni, ei, di, ci].includes(-1))
      return res.status(400).json({ error: "Invalid columns" });

    const entries = [];
    for (let i = 1; i < json.length; i++) {
      const row = json[i];
      if (!row || !row.length) continue;
      const name = row[ni]?.toString().trim();
      const email = row[ei]?.toString().trim();
      if (!name || !email) continue;
      let date = new Date(row[di]?.toString());
      if (isNaN(date.getTime())) date = new Date();
      entries.push({
        name,
        email,
        firstEntryDate: date,
        reUploadCount: parseInt(row[ci]) || 0,
      });
    }
    if (!entries.length)
      return res.status(400).json({ error: "No valid rows" });

    // Replace all data
    const snap = await subscriptionsCollection.get();
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const write = db.batch();
    entries.forEach((e) => {
      write.set(subscriptionsCollection.doc(e.email), {
        name: e.name,
        email: e.email,
        firstEntryDate: admin.firestore.Timestamp.fromDate(e.firstEntryDate),
        reUploadCount: e.reUploadCount,
      });
    });
    await write.commit();
    res.json(await getAllEntries());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Delete a single row (by email)
app.delete("/api/subscriptions/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const docRef = subscriptionsCollection.doc(email);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Entry not found" });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (e) {
    console.error("❌ Delete error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Bulk delete (keep as is)
app.delete("/api/subscriptions", async (req, res) => {
  try {
    const snap = await subscriptionsCollection.get();
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Helpers ----------
async function getAllEntries() {
  const snap = await subscriptionsCollection.orderBy("name").get();
  return snap.docs.map((d) => ({
    ...d.data(),
    firstEntryDate: d.data().firstEntryDate.toDate().toISOString(),
  }));
}

function parseNameEmailPairs(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const pairs = [],
    seen = new Set();
  for (let i = 1; i < lines.length; i++) {
    const curr = lines[i],
      prev = lines[i - 1];
    if (curr.includes("@") && /@.+\./.test(curr) && !prev.includes("@")) {
      const key = `${prev}::${curr}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ name: prev, email: curr });
        i++;
      }
    }
  }
  return pairs;
}

// Export the app for Electron
module.exports = app;

// Start the server only when run directly (not required by Electron)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
