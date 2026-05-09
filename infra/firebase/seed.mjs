import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));

function docRef(db, path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2 || parts.length % 2 !== 0) {
    throw new Error(`Invalid document path (even segments required): ${path}`);
  }
  let ref = db.collection(parts[0]).doc(parts[1]);
  for (let i = 2; i < parts.length; i += 2) {
    ref = ref.collection(parts[i]).doc(parts[i + 1]);
  }
  return ref;
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS — point it at your service account JSON (see repo .env.example).",
  );
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || "icdrrmo-b204e";
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

const db = admin.firestore();
const entries = JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf8"));

let batch = db.batch();
let n = 0;
for (const { path, data } of entries) {
  batch.set(docRef(db, path), data, { merge: true });
  n += 1;
  if (n % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}
if (n % 400 !== 0) {
  await batch.commit();
}

console.log(`Firestore seed complete: ${entries.length} document(s) in project ${projectId}.`);
