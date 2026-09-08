const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { diversityScore } = require("../services/biasEngine");

const router = express.Router();
const TOPICS = ["politics", "business", "technology", "health", "world", "general"];

router.use(requireAuth);

router.get("/dashboard", async (req, res) => {
  const userId = req.session.user.id;

  const bookmarkCountRow = await db
    .prepare("SELECT COUNT(*) AS c FROM bookmarks WHERE user_id = ?")
    .get(userId);
  const bookmarkCount = bookmarkCountRow.c;

  const recentHistory = await db
    .prepare(
      `SELECT DISTINCT a.*, s.name AS source_name, s.bias, rh.viewed_at
       FROM reading_history rh
       JOIN articles a ON a.id = rh.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE rh.user_id = ?
       ORDER BY rh.viewed_at DESC LIMIT 6`
    )
    .all(userId);

  const preferences = await db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(userId);
  const preferredTopics = JSON.parse((preferences && preferences.topics) || "[]");

  let recommended = [];
  if (preferredTopics.length) {
    const placeholders = preferredTopics.map(() => "?").join(",");
    const clusters = await db
      .prepare(
        `SELECT sc.id, sc.canonical_title, sc.topic, MAX(a.published_at) AS latest
         FROM story_clusters sc JOIN articles a ON a.cluster_id = sc.id
         WHERE sc.topic IN (${placeholders})
         GROUP BY sc.id ORDER BY latest DESC LIMIT 8`
      )
      .all(...preferredTopics);

    const articleStmt = db.prepare(
      `SELECT a.*, s.name AS source_name, s.bias, s.credibility
       FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.cluster_id = ?`
    );
    recommended = [];
    for (const c of clusters) {
      const articles = await articleStmt.all(c.id);
      recommended.push({ ...c, articles, score: diversityScore(articles) });
    }
  }

  res.render("account_dashboard", {
    title: "My Dashboard",
    bookmarkCount,
    recentHistory,
    recommended,
    preferredTopics
  });
});

router.get("/bookmarks", async (req, res) => {
  const bookmarks = await db
    .prepare(
      `SELECT a.*, s.name AS source_name, s.bias, b.created_at AS bookmarked_at, b.article_id
       FROM bookmarks b
       JOIN articles a ON a.id = b.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`
    )
    .all(req.session.user.id);

  res.render("bookmarks", { title: "My Bookmarks", bookmarks });
});

router.post("/bookmarks/:articleId/toggle", async (req, res) => {
  const userId = req.session.user.id;
  const articleId = Number(req.params.articleId);

  const existing = await db
    .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND article_id = ?")
    .get(userId, articleId);

  if (existing) {
    await db.prepare("DELETE FROM bookmarks WHERE id = ?").run(existing.id);
  } else {
    await db.prepare("INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)").run(userId, articleId);
  }

  const bookmarked = !existing;
  if (req.headers["x-requested-with"] === "fetch") {
    return res.json({ bookmarked });
  }
  res.redirect("back");
});

router.get("/preferences", async (req, res) => {
  const preferences = await db
    .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .get(req.session.user.id);
  const selectedTopics = JSON.parse((preferences && preferences.topics) || "[]");

  res.render("preferences", {
    title: "My Preferences",
    topics: TOPICS,
    selectedTopics,
    balanceMode: preferences ? preferences.balance_mode : 1,
    saved: req.query.saved === "1"
  });
});

router.post("/preferences", async (req, res) => {
  const userId = req.session.user.id;
  let selected = req.body.topics || [];
  if (!Array.isArray(selected)) selected = [selected];
  const balanceMode = req.body.balance_mode ? 1 : 0;

  const existing = await db.prepare("SELECT user_id FROM user_preferences WHERE user_id = ?").get(userId);
  if (existing) {
    await db.prepare("UPDATE user_preferences SET topics = ?, balance_mode = ? WHERE user_id = ?").run(
      JSON.stringify(selected),
      balanceMode,
      userId
    );
  } else {
    await db.prepare(
      "INSERT INTO user_preferences (user_id, topics, balance_mode) VALUES (?, ?, ?)"
    ).run(userId, JSON.stringify(selected), balanceMode);
  }

  res.redirect("/account/preferences?saved=1");
});

router.get("/history", async (req, res) => {
  const history = await db
    .prepare(
      `SELECT a.*, s.name AS source_name, s.bias, rh.viewed_at
       FROM reading_history rh
       JOIN articles a ON a.id = rh.article_id
       JOIN sources s ON s.id = a.source_id
       WHERE rh.user_id = ?
       ORDER BY rh.viewed_at DESC LIMIT 100`
    )
    .all(req.session.user.id);

  res.render("history", { title: "Reading History", history });
});

module.exports = router;
