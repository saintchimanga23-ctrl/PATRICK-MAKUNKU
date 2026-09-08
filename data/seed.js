const db = require("../config/db");
const sources = require("./sources");

async function seedSources() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO sources (name, rss_url, bias, credibility, topic_focus)
    VALUES (@name, @rss, @bias, @credibility, @topic_focus)
  `);
  if (db.transaction) {
    const tx = db.transaction((rows) => rows.map((r) => insert.run(r)));
    await tx(sources);
  } else {
    for (const row of sources) {
      await insert.run(row);
    }
  }
  console.log(`Seeded ${sources.length} sources.`);
}

/**
 * Demo story clusters + articles so the app is fully functional and
 * demonstrable WITHOUT internet access (useful for offline grading/demo,
 * and as a fallback if live RSS fetch fails). Each cluster intentionally
 * includes coverage from left/center/right rated sources to showcase the
 * diversity-balancing feature (see services/biasEngine.js).
 */
const demoClusters = [
  {
    topic: "politics",
    canonical_title: "National budget negotiations reach critical stage",
    keywords: ["budget", "negotiations", "congress", "spending"],
    articles: [
      { source: "The Guardian", title: "Budget talks stall as lawmakers clash over social spending cuts", desc: "Negotiators remain divided over proposed reductions to social programs, with progressive lawmakers warning of harm to vulnerable communities.", image: "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=800" },
      { source: "Reuters", title: "Lawmakers report incremental progress in budget negotiations", desc: "Congressional negotiators say they have narrowed differences on several spending line items but a full deal remains elusive ahead of the deadline.", image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800" },
      { source: "Fox News", title: "Fiscal conservatives push back on runaway spending in budget talks", desc: "Republican lawmakers are demanding deeper cuts, arguing the proposed budget does too little to address the growing national deficit.", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800" }
    ]
  },
  {
    topic: "technology",
    canonical_title: "Major AI regulation bill advances in legislature",
    keywords: ["ai", "regulation", "artificial", "intelligence", "bill"],
    articles: [
      { source: "The New York Times", title: "AI safety advocates hail new regulation as overdue consumer protection", desc: "Civil society groups say the bill's transparency requirements are a necessary check on powerful AI systems.", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800" },
      { source: "The Economist", title: "Lawmakers weigh costs and benefits of new AI oversight regime", desc: "Analysts note the bill could slow innovation in the short term while offering clearer compliance rules for larger firms.", image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800" },
      { source: "The Wall Street Journal", title: "Tech industry warns AI bill could push startups overseas", desc: "Industry groups argue the compliance burden disproportionately affects smaller companies and could dampen U.S. competitiveness.", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800" }
    ]
  },
  {
    topic: "business",
    canonical_title: "Central bank holds interest rates steady",
    keywords: ["interest", "rates", "central", "bank", "inflation"],
    articles: [
      { source: "NPR", title: "Central bank keeps rates unchanged, citing cooling inflation", desc: "Policymakers pointed to recent data showing inflation easing closer to target, easing pressure for further hikes.", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800" },
      { source: "Associated Press", title: "Rate decision leaves borrowing costs steady for now", desc: "The decision was widely expected by markets, which had priced in a pause after months of tightening.", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800" },
      { source: "New York Post", title: "Everyday Americans still feel the squeeze despite rate pause", desc: "Critics say the decision does little to immediately relieve high borrowing costs still weighing on household budgets.", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800" }
    ]
  },
  {
    topic: "world",
    canonical_title: "International climate summit concludes with new emissions pledges",
    keywords: ["climate", "summit", "emissions", "pledge"],
    articles: [
      { source: "Al Jazeera", title: "Developing nations say climate pledges fall short of what's needed", desc: "Delegates from smaller nations argued the new commitments fail to match the scale of the climate crisis they face.", image: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800" },
      { source: "BBC News", title: "Summit ends with new emissions targets, mixed reactions", desc: "The agreement sets fresh national targets, though observers are divided on whether the commitments go far enough.", image: "https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=800" },
      { source: "Fox News", title: "Critics question cost and enforceability of new climate deal", desc: "Some lawmakers questioned whether the pledges are realistic or will simply raise costs without measurable results.", image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800" }
    ]
  },
  {
    topic: "health",
    canonical_title: "New study links screen time to adolescent sleep patterns",
    keywords: ["study", "screen", "time", "sleep", "adolescent"],
    articles: [
      { source: "NPR", title: "Study finds strong link between late-night screen use and poor teen sleep", desc: "Researchers tracked sleep patterns of over 2,000 teenagers and found consistent disruption tied to device use after 9pm.", image: "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800" },
      { source: "Reuters", title: "Researchers urge caution in interpreting new screen-time sleep study", desc: "Some scientists note the study is observational and cannot establish that screens directly cause sleep problems.", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800" },
      { source: "New York Post", title: "Parents demand action after damning teen screen-time study", desc: "The findings have prompted calls from parent groups for schools to restrict device use during evening hours.", image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800" }
    ]
  },
  {
    topic: "world",
    canonical_title: "Regional trade agreement signed after years of talks",
    keywords: ["trade", "agreement", "tariffs", "regional"],
    articles: [
      { source: "The Wall Street Journal", title: "New trade pact seen as boost for regional exporters", desc: "Business groups welcomed the deal, saying reduced tariffs will open new markets for manufacturers.", image: "https://images.unsplash.com/photo-1605902711622-cfb43c4437d1?w=800" },
      { source: "The Guardian", title: "Labor unions raise concerns over new regional trade deal", desc: "Unions warned the agreement could accelerate job losses in sectors exposed to cheaper imports.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
      { source: "The Economist", title: "Trade deal offers modest gains, economists say", desc: "Early analysis suggests the pact will provide a small but measurable boost to GDP over the next decade.", image: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800" }
    ]
  }
];

async function seedDemoArticles() {
  const getSourceId = db.prepare(`SELECT id FROM sources WHERE name = ?`);
  const insertCluster = db.prepare(`
    INSERT INTO story_clusters (canonical_title, topic, keywords) VALUES (?, ?, ?)
  `);
  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (source_id, cluster_id, title, url, description, image_url, topic, published_at)
    VALUES (@source_id, @cluster_id, @title, @url, @description, @image_url, @topic, @published_at)
  `);

  const existing = await db.prepare(`SELECT COUNT(*) AS c FROM articles`).get();
  if (existing.c > 0) {
    console.log("Articles already present, skipping demo seed.");
    return;
  }

  const now = Date.now();
  if (db.transaction) {
    const tx = db.transaction(async () => {
      for (const [ci, cluster] of demoClusters.entries()) {
        const clusterInfo = await insertCluster.run(
          cluster.canonical_title,
          cluster.topic,
          JSON.stringify(cluster.keywords)
        );
        const clusterId = clusterInfo.lastInsertRowid;

        for (const [ai, art] of cluster.articles.entries()) {
          const src = await getSourceId.get(art.source);
          if (!src) {
            console.warn(`Source not found for demo article: ${art.source}`);
            continue;
          }
          const publishedAt = new Date(now - (ci * 3 + ai) * 3600 * 1000).toISOString();
          await insertArticle.run({
            source_id: src.id,
            cluster_id: clusterId,
            title: art.title,
            url: `https://example-demo-news.local/${cluster.topic}/${ci}-${ai}`,
            description: art.desc,
            image_url: art.image,
            topic: cluster.topic,
            published_at: publishedAt
          });
        }
      }
    });
    await tx();
  } else {
    for (const [ci, cluster] of demoClusters.entries()) {
      const clusterInfo = await insertCluster.run(
        cluster.canonical_title,
        cluster.topic,
        JSON.stringify(cluster.keywords)
      );
      const clusterId = clusterInfo.lastInsertRowid;

      for (const [ai, art] of cluster.articles.entries()) {
        const src = await getSourceId.get(art.source);
        if (!src) {
          console.warn(`Source not found for demo article: ${art.source}`);
          continue;
        }
        const publishedAt = new Date(now - (ci * 3 + ai) * 3600 * 1000).toISOString();
        await insertArticle.run({
          source_id: src.id,
          cluster_id: clusterId,
          title: art.title,
          url: `https://example-demo-news.local/${cluster.topic}/${ci}-${ai}`,
          description: art.desc,
          image_url: art.image,
          topic: cluster.topic,
          published_at: publishedAt
        });
      }
    }
  }
  console.log(`Seeded ${demoClusters.length} demo story clusters with cross-perspective articles.`);
}

(async () => {
  await seedSources();
  await seedDemoArticles();
  console.log("Seeding complete.");
})();
