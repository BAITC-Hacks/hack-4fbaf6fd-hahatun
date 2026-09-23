import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createOpenAI } from "@ai-sdk/openai";
import { generateSpeech } from "ai";
import { isLlmEnabled } from "@/lib/consilium/llm";
import { humanizeText } from "@/lib/ui/humanize";
import { OUTCOME_LABELS } from "@/lib/ui/labels";
import type { Run } from "@/lib/types";

// The arbiter's resolution read aloud. Text is built by code from the saved run; audio is cached per run id.
const MAX_CHARS = 1500;

export function voiceText(run: Pick<Run, "resolution">): string {
  const { outcome, justification, mandates } = run.resolution;
  const parts = [`Постановляю: ${OUTCOME_LABELS[outcome].toLowerCase()}.`, justification.trim()];
  if (mandates.length > 0) parts.push(`Поручения: ${mandates.map((m) => m.text.trim().replace(/\.$/, "")).join("; ")}.`);
  const text = humanizeText(parts.join(" ")).replace(/\s+/g, " ");
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1).replace(/[^.!?]*$/, "").trim()}` : text;
}

function voiceDir(): string {
  const base = process.env.DATA_DIR?.trim() || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "runs");
  return path.join(path.dirname(base), "voice");
}

let provider: ReturnType<typeof createOpenAI> | null = null;

export async function voiceMp3(run: Run): Promise<Uint8Array> {
  if (!isLlmEnabled()) throw new Error("LLM disabled");
  const dir = voiceDir();
  const file = path.join(dir, `${run.id}.mp3`);
  try {
    return new Uint8Array(await readFile(/* turbopackIgnore: true */ file));
  } catch {
    // not cached yet
  }
  provider ??= createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await generateSpeech({
    model: provider.speech(process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts"),
    text: voiceText(run),
    voice: process.env.OPENAI_TTS_VOICE?.trim() || "onyx",
    outputFormat: "mp3",
    language: "ru",
    instructions: "Спокойный, уверенный голос руководителя, читающего официальное постановление. Русский язык, ровный темп.",
    maxRetries: 2,
  });
  const bytes = result.audio.uint8Array;
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(file, bytes);
  } catch {
    // cache is best-effort
  }
  return bytes;
}
