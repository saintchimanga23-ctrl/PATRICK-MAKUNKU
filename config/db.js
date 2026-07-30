const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "..", "newshub.sqlite3");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT UNIQUE NOT NULL,
  rss_url       TEXT NOT NULL,
  bias          INTEGER NOT NULL DEFAULT 0,   -- -2..2
  credibility   INTEGER NOT NULL DEFAULT 70,  -- 0..100
  topic_focus   TEXT DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS story_clusters (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_title TEXT NOT NULL,
  topic          TEXT DEFAULT 'general',
  keywords       TEXT,               -- JSON array, used for clustering
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id     INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  cluster_id    INTEGER REFERENCES story_clusters(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  url           TEXT UNIQUE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  topic         TEXT DEFAULT 'general',
  published_at  TEXT,
  fetched_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, article_id)
);

CREATE TABLE IF NOT EXISTS reading_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  viewed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  topics        TEXT DEFAULT '[]',      -- JSON array of preferred topics
  balance_mode  INTEGER NOT NULL DEFAULT 1  -- 1 = show diverse perspectives, 0 = show as-is
);

CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
`);

module.exports = db;
