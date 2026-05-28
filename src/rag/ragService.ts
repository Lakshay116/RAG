import { v4 as uuidv4 } from "uuid";
import { QueryAnswer } from "../models/types";
import { embedText, embedTexts, generateAnswer } from "../services/llmClient";
import { saveChunks, searchTopChunksByTenant } from "../services/repositories";

function chunkText(text: string, chunkSize = 600, overlap = 120): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = end - overlap;
  }
  return chunks;
}

function buildRagPrompt(query: string, contextBlocks: string[]): string {
  return [
    "You are an AI assistant for a multi-tenant knowledge app.",
    "If tenant context is relevant, prioritize it.",
    "If tenant context is weak or irrelevant, answer using your general knowledge.",
    "When context is used, keep the answer grounded and practical.",
    "",
    `Question: ${query}`,
    "",
    "Context:",
    contextBlocks.map((text, idx) => `[${idx + 1}] ${text}`).join("\n\n")
  ].join("\n");
}

function buildGeneralPrompt(query: string): string {
  return [
    "You are a helpful AI assistant.",
    "Answer clearly and directly.",
    "",
    `Question: ${query}`
  ].join("\n");
}

export async function ingestDocument(tenantId: string, documentId: string, text: string) {
  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks);
  const chunkRecords = chunks.map((chunk, idx) => ({
    id: uuidv4(),
    tenantId,
    documentId,
    chunkText: chunk,
    embedding: embeddings[idx]
  }));
  await saveChunks(chunkRecords);
  return { chunkCount: chunkRecords.length };
}

export async function answerQuery(tenantId: string, query: string): Promise<QueryAnswer> {
  const queryEmbedding = await embedText(query);
  const scored = await searchTopChunksByTenant(tenantId, queryEmbedding, 4);

  if (scored.length === 0) {
    const generalAnswer = await generateAnswer(buildGeneralPrompt(query));
    return {
      answer: generalAnswer,
      sources: [],
      confidence: 0.5
    };
  }

  const topScore = scored[0].score;
  const context = scored.map((s) => s.chunk.chunkText);
  const relevanceThreshold = 0.2;

  if (topScore < relevanceThreshold) {
    const generalAnswer = await generateAnswer(buildGeneralPrompt(query));
    return {
      answer: generalAnswer,
      sources: [],
      confidence: 0.5
    };
  }

  const answer = await generateAnswer(buildRagPrompt(query, context));

  const sources = scored.map(({ chunk, score, fileName }) => ({
      documentId: chunk.documentId,
      chunkId: chunk.id,
      fileName,
      snippet: chunk.chunkText.slice(0, 160),
      score
    }));

  return {
    answer,
    sources,
    confidence: Number(topScore.toFixed(3))
  };
}
