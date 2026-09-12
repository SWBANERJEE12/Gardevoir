import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "data", "groq-memory.json");
const MAX_LESSONS = 80;

export type MemoryStore = {
  lessons: string[];
  updated_at: string;
};

async function readStore(): Promise<MemoryStore> {
  try {
    const raw = await readFile(MEMORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as MemoryStore;
    return { lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [], updated_at: parsed.updated_at || "" };
  } catch {
    return { lessons: [], updated_at: "" };
  }
}

export async function loadLessons(extra: string[] = []): Promise<string[]> {
  const store = await readStore();
  const merged = [...store.lessons, ...extra]
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(merged)).slice(-MAX_LESSONS);
}

export async function rememberLessons(lessons: string[]): Promise<string[]> {
  const next = await loadLessons(lessons);
  const payload = JSON.stringify({ lessons: next, updated_at: new Date().toISOString() }, null, 2);
  const targets = [MEMORY_FILE, path.join("/tmp", "gardevoir-groq-memory.json")];
  for (const file of targets) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, payload, "utf8");
      break;
    } catch {
      continue;
    }
  }
  return next;
}
