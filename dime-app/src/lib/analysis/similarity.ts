import fs from "fs";
import path from "path";
import natural from "natural";

type SimilarProject = {
  description: string;
  score: number;
  type: "idea" | "github";
};

type SimilarityResult = {
  similar_projects: SimilarProject[];
  max_similarity: number;
  novelty_score: number;
};

type LoadedCorpus = {
  descriptions: string[];
  tfidf: natural.TfIdf;
  vocabulary: Set<string>;
  docVectors: Map<string, number>[];
  docNorms: number[];
};

type DatasetEntry = {
  original: string;
  normalized: string;
};

const GITHUB_DATASET_PATH = path.join(process.cwd(), "datasets", "github_cleaned.csv");
const IDEA_DATASET_PATHS = [
  path.join(process.cwd(), "datasets", "ideas_clean_description.csv"),
];
const CLEAN_DESCRIPTION_COLUMN = "clean_description";
const TOP_K = 5;
const GITHUB_TOP_K = 3;
const MAX_DATASET_ROWS = 2000;
const IDEA_SCORE_BOOST = 1.1;
const GENERIC_WORDS = new Set(["system", "platform", "tool", "app", "software"]);
const GENERIC_WORD_MULTIPLIER = 0.45;
const DOMAIN_WORD_MULTIPLIER = 1.65;
const DEFAULT_WORD_MULTIPLIER = 1;

const tokenizer = new natural.WordTokenizer();

function normalizeHeader(value: string): string {
  return value.toLowerCase().trim();
}

function parseCsvSafely(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      const nextChar = content[i + 1];
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && content[i + 1] === "\n") {
        i += 1;
      }

      currentRow.push(currentValue);
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return tokenizer
    .tokenize(normalizeText(text))
    .map((token: string) => token.trim())
    .filter((token: string) => token.length > 0);
}

function buildVectorFromTerms(terms: { term: string; tfidf: number }[]): Map<string, number> {
  const vector = new Map<string, number>();

  for (const entry of terms) {
    if (!Number.isFinite(entry.tfidf) || entry.tfidf <= 0) {
      continue;
    }
    vector.set(entry.term, entry.tfidf);
  }

  return vector;
}

function calculateNorm(vector: Map<string, number>): number {
  let sumSquares = 0;
  for (const weight of vector.values()) {
    sumSquares += weight * weight;
  }
  return Math.sqrt(sumSquares);
}

function loadDescriptionsFromCsv(datasetPath: string): string[] {
  if (!fs.existsSync(datasetPath)) {
    return [];
  }

  const rawCsv = fs.readFileSync(datasetPath, "utf-8").replace(/^\uFEFF/, "");
  const rows = parseCsvSafely(rawCsv);

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((column) => normalizeHeader(column));
  const cleanDescriptionIndex = header.indexOf(CLEAN_DESCRIPTION_COLUMN);

  if (cleanDescriptionIndex === -1) {
    throw new Error(`CSV is missing required column: ${CLEAN_DESCRIPTION_COLUMN}`);
  }

  return rows
    .slice(1)
    .map((row) => (row[cleanDescriptionIndex] ?? "").trim())
    .filter((value) => value.length > 0);
}

function loadDatasetEntries(datasetPaths: string[], datasetLabel: string): DatasetEntry[] {
  const descriptions = datasetPaths.flatMap((datasetPath) => loadDescriptionsFromCsv(datasetPath));

  if (descriptions.length === 0) {
    console.warn(`No rows found for ${datasetLabel} dataset from paths: ${datasetPaths.join(", ")}`);
    return [];
  }

  const dedupedCorpus = [...new Set(descriptions.filter((value) => value.length > 0))].slice(
    0,
    MAX_DATASET_ROWS,
  );

  return dedupedCorpus.map((description) => ({
    original: description,
    normalized: normalizeText(description),
  }));
}

function buildCorpusFromDescriptions(descriptions: string[]): LoadedCorpus {
  if (descriptions.length === 0) {
    return {
      descriptions: [],
      tfidf: new natural.TfIdf(),
      vocabulary: new Set<string>(),
      docVectors: [],
      docNorms: [],
    };
  }

  const tfidf = new natural.TfIdf();
  for (const description of descriptions) {
    tfidf.addDocument(normalizeText(description));
  }

  const vocabulary = new Set<string>();
  const docVectors: Map<string, number>[] = [];
  const docNorms: number[] = [];

  for (let index = 0; index < descriptions.length; index += 1) {
    const terms = tfidf.listTerms(index);
    const vector = buildVectorFromTerms(terms);
    for (const term of vector.keys()) {
      vocabulary.add(term);
    }
    docVectors.push(vector);
    docNorms.push(calculateNorm(vector));
  }

  const corpus: LoadedCorpus = {
    descriptions,
    tfidf,
    vocabulary,
    docVectors,
    docNorms,
  };

  return corpus;
}

const PRELOADED_GITHUB_DATASET = loadDatasetEntries([GITHUB_DATASET_PATH], "github");
const PRELOADED_IDEA_DATASET = loadDatasetEntries(IDEA_DATASET_PATHS, "ideas");
console.log("Loaded ideas file successfully");

const PRECOMPUTED_GITHUB_CORPUS = buildCorpusFromDescriptions(
  PRELOADED_GITHUB_DATASET.map((entry) => entry.original),
);
const PRECOMPUTED_IDEA_CORPUS = buildCorpusFromDescriptions(
  PRELOADED_IDEA_DATASET.map((entry) => entry.original),
);

console.log("TF-IDF built once");

function extractDomainKeywords(tokens: string[]): string[] {
  return [...new Set(tokens)].filter(
    (token) => token.length > 4 && !GENERIC_WORDS.has(token),
  );
}

function filterDescriptionsByDomainKeywords(
  dataset: DatasetEntry[],
  domainKeywords: string[],
): string[] {
  if (domainKeywords.length === 0) {
    return [];
  }

  return dataset
    .filter((entry) => domainKeywords.some((keyword) => entry.normalized.includes(keyword)))
    .map((entry) => entry.original);
}

function extractDomainSpecificTerms(tokens: string[], corpus: LoadedCorpus): Set<string> {
  const unique = [...new Set(tokens)].filter((token) => {
    return token.length > 3 && !GENERIC_WORDS.has(token) && corpus.vocabulary.has(token);
  });

  return new Set(
    unique
      .map((term) => ({ term, idf: corpus.tfidf.idf(term) }))
      .filter((entry) => Number.isFinite(entry.idf) && entry.idf > 0)
      .sort((a, b) => b.idf - a.idf)
      .slice(0, 8)
      .map((entry) => entry.term),
  );
}

function getTermMultiplier(term: string, domainTerms: Set<string>): number {
  if (GENERIC_WORDS.has(term)) {
    return GENERIC_WORD_MULTIPLIER;
  }

  if (domainTerms.has(term)) {
    return DOMAIN_WORD_MULTIPLIER;
  }

  return DEFAULT_WORD_MULTIPLIER;
}

function buildQueryVector(
  input: string,
  corpus: LoadedCorpus,
  domainTerms: Set<string>,
): Map<string, number> {
  const tokens = tokenize(input);
  if (tokens.length === 0) {
    return new Map<string, number>();
  }

  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    if (!corpus.vocabulary.has(token)) {
      continue;
    }
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  const tokenCount = Array.from(frequencies.values()).reduce((sum, count) => sum + count, 0);
  if (tokenCount === 0) {
    return new Map<string, number>();
  }

  const vector = new Map<string, number>();
  for (const [term, count] of frequencies.entries()) {
    const tf = count / tokenCount;
    const idf = corpus.tfidf.idf(term);
    const weight = tf * idf * getTermMultiplier(term, domainTerms);

    if (Number.isFinite(weight) && weight > 0) {
      vector.set(term, weight);
    }
  }

  return vector;
}

function cosineSimilarity(
  queryVector: Map<string, number>,
  queryNorm: number,
  docVector: Map<string, number>,
  docNorm: number,
  domainTerms: Set<string>,
): number {
  if (queryNorm === 0 || docNorm === 0) {
    return 0;
  }

  let dotProduct = 0;
  for (const [term, queryWeight] of queryVector.entries()) {
    const docWeight = docVector.get(term);
    if (docWeight !== undefined) {
      dotProduct += queryWeight * docWeight * getTermMultiplier(term, domainTerms);
    }
  }

  return dotProduct / (queryNorm * docNorm);
}

function roundScore(value: number): number {
  return Number(value.toFixed(6));
}

export function getSimilarity(input: string): SimilarityResult {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return {
      similar_projects: [],
      max_similarity: 0,
      novelty_score: 1,
    };
  }

  const inputTokens = tokenize(normalizedInput);
  const inputDomainKeywords = extractDomainKeywords(inputTokens);

  const filteredIdeaDescriptions = filterDescriptionsByDomainKeywords(
    PRELOADED_IDEA_DATASET,
    inputDomainKeywords,
  );
  const filteredGithubDescriptions = filterDescriptionsByDomainKeywords(
    PRELOADED_GITHUB_DATASET,
    inputDomainKeywords,
  );

  const ideaCorpus =
    filteredIdeaDescriptions.length > 0
      ? buildCorpusFromDescriptions(filteredIdeaDescriptions)
      : PRECOMPUTED_IDEA_CORPUS;
  const githubCorpus =
    filteredGithubDescriptions.length > 0
      ? buildCorpusFromDescriptions(filteredGithubDescriptions)
      : PRECOMPUTED_GITHUB_CORPUS;

  if (ideaCorpus.descriptions.length === 0 && githubCorpus.descriptions.length === 0) {
    return {
      similar_projects: [],
      max_similarity: 0,
      novelty_score: 1,
    };
  }

  const scoreCorpus = (
    corpus: LoadedCorpus,
    resultType: "idea" | "github",
    scoreMultiplier = 1,
  ): SimilarProject[] => {
    if (corpus.descriptions.length === 0) {
      return [];
    }

    const domainTerms = extractDomainSpecificTerms(inputTokens, corpus);
    const queryVector = buildQueryVector(normalizedInput, corpus, domainTerms);
    const queryNorm = calculateNorm(queryVector);

    return corpus.descriptions
      .map((description, index) => {
        const score = cosineSimilarity(
          queryVector,
          queryNorm,
          corpus.docVectors[index],
          corpus.docNorms[index],
          domainTerms,
        );

        return {
          description,
          score: score * scoreMultiplier,
          type: resultType,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => ({
        description: item.description,
        score: roundScore(item.score),
        type: item.type,
      }));
  };

  const ideaResults = scoreCorpus(ideaCorpus, "idea", IDEA_SCORE_BOOST).slice(0, TOP_K);
  const githubResults = scoreCorpus(githubCorpus, "github").slice(0, GITHUB_TOP_K);

  const similar_projects = [...ideaResults, ...githubResults].map((item) => ({
    description: item.description,
    score: roundScore(item.score),
    type: item.type,
  }));

  const max_similarity = similar_projects.reduce((max, item) => Math.max(max, item.score), 0);
  const novelty_score = roundScore(Math.max(0, 1 - max_similarity));

  return {
    similar_projects,
    max_similarity,
    novelty_score,
  };
}
