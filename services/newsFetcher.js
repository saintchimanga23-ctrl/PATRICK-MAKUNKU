const Parser = require("rss-parser");
const db = require("../config/db");
const { findMatchingCluster, tokenize } = require("./biasEngine");

const parser = new Parser({ timeout: 10000 });

function guessTopic(title, defaultTopic) {
  const t = title.toLowerCase();
  if (/(election|senate|congress|president|policy|government|minister)/.test(t)) return "politics";
  if (/(market|stock|economy|inflation|trade|bank|jobs)/.test(t)) return "business";
  if (/(ai|tech|software|app|cyber|robot|chip)/.test(t)) return "technology";
  if (/(climate|health|disease|hospital|vaccine|study)/.test(t)) return "health";
  if (/(war|conflict|summit|nation|country|region)/.test(t)) return "world";
  return defaultTopic || "general";
}

async function fetchAllSources() {
  const sources = db.prepare("SELECT * FROM sources").all();
  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles
      (source_id, cluster_id, title, url, description, image_url, topic, published_at)
    VALUES (@source_id, @cluster_id, @title, @url, @description, @image_url, @topic, @published_at)
  `);
  const insertCluster = db.prepare(`
    INSERT INTO story_clusters (canonical_title, topic, keywords) VALUES (?, ?, ?)
  `);
  const updateClusterKeywords = db.prepare(`UPDATE story_clusters SET keywords = ? WHERE id = ?`);

  let totalNew = 0;

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rss_url);
      // Load current clusters fresh (with parsed keyword arrays) for matching
      const clusterRows = db.prepare("SELECT id, keywords FROM story_clusters").all();
      const clusters = clusterRows.map((c) => ({
        id: c.id,
        keywords: JSON.parse(c.keywords || "[]")
      }));

      for (const item of feed.items || []) {
        if (!item.title || !item.link) continue;

        const exists = db.prepare("SELECT id FROM articles WHERE url = ?").get(item.link);
        if (exists) continue;

        const topic = guessTopic(item.title, source.topic_focus);
        const tokens = tokenize(item.title);

        let clusterId = findMatchingCluster(item.title, clusters);
        if (!clusterId) {
          const info = insertCluster.run(item.title, topic, JSON.stringify(tokens));
          clusterId = info.lastInsertRowid;
          clusters.push({ id: clusterId, keywords: tokens });
        } else {
          // merge keyword sets slightly so the cluster stays discoverable
          const cluster = clusters.find((c) => c.id === clusterId);
          const merged = Array.from(new Set([...(cluster.keywords || []), ...tokens])).slice(0, 25);
          cluster.keywords = merged;
          updateClusterKeywords.run(JSON.stringify(merged), clusterId);
        }

        insertArticle.run({
          source_id: source.id,
          cluster_id: clusterId,
          title: item.title,
          url: item.link,
          description: (item.contentSnippet || item.content || "").slice(0, 400),
          image_url: (item.enclosure && item.enclosure.url) || null,
          topic,
          published_at: item.isoDate || item.pubDate || new Date().toISOString()
        });
        totalNew++;
      }
      console.log(`[newsFetcher] ${source.name}: OK`);
    } catch (err) {
      console.warn(`[newsFetcher] ${source.name}: FAILED (${err.message})`);
    }
  }

  console.log(`[newsFetcher] Done. ${totalNew} new articles stored.`);
  return totalNew;
}

// Allow running standalone: `node services/newsFetcher.js --once`
if (require.main === module) {
  fetchAllSources()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fetchAllSources };
