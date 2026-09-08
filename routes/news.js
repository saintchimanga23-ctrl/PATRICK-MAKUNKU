const express = require("express");
const db = require("../config/db");
const { diversityScore, groupByLean, biasLabel } = require("../services/biasEngine");

const router = express.Router();

const TOPICS = ["politics", "business", "technology", "health", "world", "general"];

/** Fetch recent story clusters with their joined articles + source bias info. */
async function getClustersWithArticles({ topic = null, limit = 12, excludeId = null } = {}) {
  let clusterQuery = `
    SELECT sc.id, sc.canonical_title, sc.topic, sc.created_at,
           MAX(a.published_at) AS latest_published
    FROM story_clusters sc
    JOIN articles a ON a.cluster_id = sc.id
  `;
  const params = [];
  const conditions = [];
  if (topic) {
    conditions.push("sc.topic = ?");
    params.push(topic);
  }
  if (excludeId) {
    conditions.push("sc.id != ?");
    params.push(excludeId);
  }
  if (conditions.length) clusterQuery += " WHERE " + conditions.join(" AND ");
  clusterQuery += " GROUP BY sc.id ORDER BY latest_published DESC LIMIT ?";
  params.push(limit);

  const clusters = await db.prepare(clusterQuery).all(...params);

  const articleStmt = db.prepare(`
    SELECT a.*, s.name AS source_name, s.bias, s.credibility
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    WHERE a.cluster_id = ?
    ORDER BY a.published_at DESC
  `);

  const mapped = [];
  for (const cluster of clusters) {
    const articles = await articleStmt.all(cluster.id);
    mapped.push({
      ...cluster,
      articles,
      score: diversityScore(articles),
      leadImage: (articles.find((a) => a.image_url) || {}).image_url || null,
      sourceCount: new Set(articles.map((a) => a.source_id)).size
    });
  }

  return mapped;
}

// ---------------------------------------------------------------------------
// Home page — attention-grabbing landing page (public)
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const clusters = await getClustersWithArticles({ limit: 6 });
  const mostDiverse = [...clusters].sort((a, b) => b.score - a.score).slice(0, 3);
  const stats = {
    sources: (await db.prepare("SELECT COUNT(*) AS c FROM sources").get()).c,
    articles: (await db.prepare("SELECT COUNT(*) AS c FROM articles").get()).c,
    stories: (await db.prepare("SELECT COUNT(*) AS c FROM story_clusters").get()).c
  };

  res.render("index", {
    title: "NewsHub — See the Full Story",
    clusters,
    mostDiverse,
    stats,
    topics: TOPICS
  });
});

// ---------------------------------------------------------------------------
// Feed / dashboard — main browsing experience
// ---------------------------------------------------------------------------
router.get("/feed", async (req, res) => {
  const topic = TOPICS.includes(req.query.topic) ? req.query.topic : null;
  const clusters = await getClustersWithArticles({ topic, limit: 30 });

  let preferences = null;
  if (req.session.user) {
    preferences = await db
      .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
      .get(req.session.user.id);
  }

  res.render("feed", {
    title: topic ? `${topic[0].toUpperCase() + topic.slice(1)} News` : "Your Feed",
    clusters,
    topics: TOPICS,
    activeTopic: topic,
    preferences
  });
});

// ---------------------------------------------------------------------------
// Story detail — the core "diversity view" showing multiple perspectives
// ---------------------------------------------------------------------------
router.get("/story/:id", async (req, res) => {
  const clusterId = Number(req.params.id);
  const cluster = await db.prepare("SELECT * FROM story_clusters WHERE id = ?").get(clusterId);
  if (!cluster) return res.status(404).render("404", { title: "Story not found" });

  const articles = await db
    .prepare(
      `SELECT a.*, s.name AS source_name, s.bias, s.credibility
       FROM articles a JOIN sources s ON s.id = a.source_id
       WHERE a.cluster_id = ? ORDER BY s.bias ASC, a.published_at DESC`
    )
    .all(clusterId);

  const grouped = groupByLean(articles);
  const score = diversityScore(articles);

  if (req.session.user && articles.length) {
    await db.prepare(
      "INSERT INTO reading_history (user_id, article_id, viewed_at) VALUES (?, ?, datetime('now'))"
    ).run(req.session.user.id, articles[0].id);
  }

  let bookmarkedIds = new Set();
  if (req.session.user) {
    const rows = await db
      .prepare(
        `SELECT article_id FROM bookmarks WHERE user_id = ? AND article_id IN (${articles
          .map(() => "?")
          .join(",") || "NULL"})`
      )
      .all(req.session.user.id, ...articles.map((a) => a.id));
    bookmarkedIds = new Set(rows.map((r) => r.article_id));
  }

  const related = await getClustersWithArticles({ topic: cluster.topic, limit: 4, excludeId: cluster.id });

  res.render("story", {
    title: cluster.canonical_title,
    cluster,
    grouped,
    score,
    biasLabel,
    bookmarkedIds,
    related
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  let results = [];
  if (q) {
    results = await db
      .prepare(
        `SELECT a.*, s.name AS source_name, s.bias, s.credibility
         FROM articles a JOIN sources s ON s.id = a.source_id
         WHERE a.title LIKE ? OR a.description LIKE ?
         ORDER BY a.published_at DESC LIMIT 40`
      )
      .all(`%${q}%`, `%${q}%`);
  }
  res.render("search", { title: `Search: ${q || "..."}`, q, results });
});

module.exports = router;
