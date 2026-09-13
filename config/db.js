const path = require("path");
const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

const usePostgres = Boolean(connectionString);

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    rss_url TEXT NOT NULL,
    bias INTEGER NOT NULL DEFAULT 0,
    credibility INTEGER NOT NULL DEFAULT 70,
    topic_focus TEXT DEFAULT 'general'
  );
  CREATE TABLE IF NOT EXISTS story_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_title TEXT NOT NULL,
    topic TEXT DEFAULT 'general',
    keywords TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    cluster_id INTEGER REFERENCES story_clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    topic TEXT DEFAULT 'general',
    published_at TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, article_id)
  );
  CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    topics TEXT DEFAULT '[]',
    balance_mode INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
  CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
  CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
`;

function buildSqlite() {
  const sqlite3 = require("sqlite3").verbose();
  const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "newshub.sqlite3");
  const sqlite = new sqlite3.Database(dbPath);

  const ready = new Promise((resolve, reject) => {
    sqlite.serialize(() => {
      sqlite.run("PRAGMA foreign_keys = ON");
      sqlite.exec(sqliteSchema, (error) => (error ? reject(error) : resolve()));
    });
  });

  const prepare = (sql) => ({
    get: (...params) => new Promise((resolve, reject) => {
      ready.then(() => sqlite.get(sql, params, (error, row) => error ? reject(error) : resolve(row))).catch(reject);
    }),
    all: (...params) => new Promise((resolve, reject) => {
      ready.then(() => sqlite.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))).catch(reject);
    }),
    run: (...params) => new Promise((resolve, reject) => {
      ready.then(() => sqlite.run(sql, params, function (error) {
        if (error) return reject(error);
        resolve({ lastInsertRowid: this.lastID, changes: this.changes, rowCount: this.changes });
      })).catch(reject);
    })
  });

  return {
    prepare,
    exec: (sql) => new Promise((resolve, reject) => {
      ready.then(() => sqlite.exec(sql, (error) => error ? reject(error) : resolve())).catch(reject);
    }),
    ready,
    pragma: (sql) => sqlite.run(`PRAGMA ${sql}`),
    end: () => new Promise((resolve, reject) => sqlite.close((error) => error ? reject(error) : resolve()))
  };
}

function normalizeSql(sql) {
  let normalized = sql.trim();
  normalized = normalized.replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP");
  normalized = normalized.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
  if (/^INSERT\s+INTO/i.test(normalized) && !/ON\s+CONFLICT/i.test(normalized) && !/RETURNING\b/i.test(normalized)) {
    normalized = `${normalized} ON CONFLICT DO NOTHING`;
  }
  return normalized;
}

const pool = usePostgres ? new Pool({
  connectionString,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : undefined
}) : null;

const prepare = (sql) => {
  const text = normalizeSql(sql);
  const paramsCount = (text.match(/\?/g) || []).length;
  const sqlForPg = paramsCount
    ? text.replace(/\?/g, (...args) => `$${((text.slice(0, args[1]).match(/\?/g) || []).length) + 1}`)
    : text;

  const finalSql = /^INSERT\s+INTO/i.test(text) && !/RETURNING\b/i.test(text)
    ? `${sqlForPg} RETURNING id`
    : sqlForPg;

  return {
    get: async (...params) => {
      await schemaReady;
      const result = await pool.query(finalSql, params);
      return result.rows[0] || undefined;
    },
    all: async (...params) => {
      await schemaReady;
      const result = await pool.query(finalSql, params);
      return result.rows;
    },
    run: async (...params) => {
      await schemaReady;
      const result = await pool.query(finalSql, params);
      const firstRow = result.rows[0] || null;
      return {
        lastInsertRowid: firstRow && firstRow.id !== undefined ? Number(firstRow.id) : null,
        changes: result.rowCount || 0,
        rowCount: result.rowCount || 0
      };
    }
  };
};

const exec = async (sql) => {
  await schemaReady;
  return pool.query(normalizeSql(sql));
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const schemaReady = usePostgres ? pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    rss_url TEXT NOT NULL,
    bias INTEGER NOT NULL DEFAULT 0,
    credibility INTEGER NOT NULL DEFAULT 70,
    topic_focus TEXT DEFAULT 'general'
  );

  CREATE TABLE IF NOT EXISTS story_clusters (
    id SERIAL PRIMARY KEY,
    canonical_title TEXT NOT NULL,
    topic TEXT DEFAULT 'general',
    keywords TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    cluster_id INTEGER REFERENCES story_clusters(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    topic TEXT DEFAULT 'general',
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, article_id)
  );

  CREATE TABLE IF NOT EXISTS reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    topics TEXT DEFAULT '[]',
    balance_mode INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
  CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic);
  CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
`).catch((err) => {
  console.warn("[db] Postgres schema init warning:", err.message);
  throw err;
}) : Promise.resolve();

const db = usePostgres
  ? { prepare, exec, transaction, pool, ready: schemaReady, pragma: () => {}, end: () => pool.end() }
  : buildSqlite();
module.exports = db;
if (usePostgres) module.exports.pool = pool;
