import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function flattenKeys(input, prefix = "") {
  if (typeof input !== "object" || input === null) {
    return [];
  }

  const entries = Object.entries(input);
  const keys = [];

  for (const [key, value] of entries) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }

  return keys;
}

async function loadJson(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

async function run() {
  const root = process.cwd();
  const enPath = resolve(root, "messages/en.json");
  const plPath = resolve(root, "messages/pl.json");

  const [en, pl] = await Promise.all([loadJson(enPath), loadJson(plPath)]);

  const enKeys = new Set(flattenKeys(en));
  const plKeys = new Set(flattenKeys(pl));

  const missingInPl = [...enKeys].filter((key) => !plKeys.has(key)).sort();
  const missingInEn = [...plKeys].filter((key) => !enKeys.has(key)).sort();

  if (missingInPl.length === 0 && missingInEn.length === 0) {
    console.log("i18n keys are aligned between en and pl catalogs.");
    return;
  }

  if (missingInPl.length > 0) {
    console.error("Missing in pl:");
    for (const key of missingInPl) {
      console.error(`- ${key}`);
    }
  }

  if (missingInEn.length > 0) {
    console.error("Missing in en:");
    for (const key of missingInEn) {
      console.error(`- ${key}`);
    }
  }

  process.exitCode = 1;
}

run().catch((error) => {
  console.error("Failed to validate i18n keys", error);
  process.exitCode = 1;
});
