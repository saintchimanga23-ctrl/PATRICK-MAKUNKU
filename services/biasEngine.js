/**
 * biasEngine.js
 * -----------------------------------------------------------------------
 * This module implements the project's core novel contribution:
 * automatically grouping articles about the same real-world event into a
 * "story cluster," then scoring and presenting that cluster so a reader
 * sees the spread of political framing (left / center / right) and
 * average source credibility for that story at a glance.
 *
 * Clustering approach: lightweight keyword-overlap (Jaccard similarity)
 * on stop-word-filtered title tokens. This is intentionally simple and
 * explainable for an undergraduate project (see report Section 5,
 * "Design Justification") rather than a full NLP/embedding pipeline,
 * while still producing meaningful groupings for demo purposes.
 */

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","by","as","it","its","this","that",
  "after","over","amid","new","says","say","said","will","not","no","from",
  "who","what","why","how","into","than","their","they","he","she"
]);

const BIAS_LABELS = {
  "-2": "Left",
  "-1": "Lean Left",
  "0": "Center",
  "1": "Lean Right",
  "2": "Right"
};

function biasLabel(biasValue) {
  return BIAS_LABELS[String(biasValue)] || "Unknown";
}

function tokenize(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Given a new article's title and a list of existing clusters
 * ({ id, keywords: string[] }), return the best matching cluster id
 * if similarity exceeds the threshold, otherwise null (caller should
 * create a new cluster).
 */
function findMatchingCluster(title, clusters, threshold = 0.34) {
  const tokens = tokenize(title);
  let best = { id: null, score: 0 };

  for (const cluster of clusters) {
    const score = jaccardSimilarity(tokens, cluster.keywords || []);
    if (score > best.score) {
      best = { id: cluster.id, score };
    }
  }

  return best.score >= threshold ? best.id : null;
}

/**
 * Computes a 0-100 "Perspective Diversity Score" for a set of articles
 * (a story cluster). Rewards clusters that include coverage from
 * multiple distinct bias categories, and factors in average credibility.
 */
function diversityScore(articlesWithSourceInfo) {
  if (!articlesWithSourceInfo.length) return 0;

  const biasValues = articlesWithSourceInfo.map((a) => a.bias);
  const uniqueBiasCategories = new Set(biasValues).size;
  const spread = Math.max(...biasValues) - Math.min(...biasValues); // 0..4
  const avgCredibility =
    articlesWithSourceInfo.reduce((sum, a) => sum + a.credibility, 0) /
    articlesWithSourceInfo.length;

  const coverageComponent = Math.min(uniqueBiasCategories / 3, 1) * 50; // up to 50 pts for 3+ distinct viewpoints
  const spreadComponent = Math.min(spread / 4, 1) * 30; // up to 30 pts for wide left-right spread
  const credibilityComponent = (avgCredibility / 100) * 20; // up to 20 pts

  return Math.round(coverageComponent + spreadComponent + credibilityComponent);
}

/**
 * Buckets a cluster's articles into left / center / right groups for
 * clean side-by-side rendering in the UI.
 */
function groupByLean(articlesWithSourceInfo) {
  const groups = { left: [], center: [], right: [] };
  for (const article of articlesWithSourceInfo) {
    if (article.bias <= -1) groups.left.push(article);
    else if (article.bias === 0) groups.center.push(article);
    else groups.right.push(article);
  }
  return groups;
}

module.exports = {
  tokenize,
  jaccardSimilarity,
  findMatchingCluster,
  diversityScore,
  groupByLean,
  biasLabel,
  BIAS_LABELS
};
