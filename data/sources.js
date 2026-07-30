/**
 * Curated source list with bias-lean and credibility classifications.
 *
 * IMPORTANT (see research report, Section 4.3 "Bias Classification Methodology"):
 * The `bias` and `credibility` values below are illustrative approximations
 * modeled on publicly available media-bias methodologies (AllSides Media
 * Bias Chart, Ad Fontes Media Bias Chart). They are used here purely to
 * demonstrate the diversity-balancing algorithm for an academic project and
 * are NOT presented as an authoritative or final judgement of any outlet.
 * A production deployment should pull live ratings from a licensed API.
 *
 * bias scale:  -2 = left, -1 = lean-left, 0 = center, 1 = lean-right, 2 = right
 * credibility: 0-100 (higher = generally more fact-based reporting)
 */

module.exports = [
  { name: "BBC News",        rss: "http://feeds.bbci.co.uk/news/rss.xml",                 bias: 0,  credibility: 90, topic_focus: "world" },
  { name: "Reuters",         rss: "https://feeds.reuters.com/reuters/topNews",             bias: 0,  credibility: 93, topic_focus: "world" },
  { name: "Associated Press",rss: "https://rsshub.app/apnews/topics/apf-topnews",          bias: 0,  credibility: 92, topic_focus: "world" },
  { name: "The Guardian",    rss: "https://www.theguardian.com/world/rss",                 bias: -1, credibility: 84, topic_focus: "world" },
  { name: "NPR",             rss: "https://feeds.npr.org/1001/rss.xml",                    bias: -1, credibility: 87, topic_focus: "us" },
  { name: "CNN",             rss: "http://rss.cnn.com/rss/cnn_topstories.rss",             bias: -1, credibility: 78, topic_focus: "us" },
  { name: "The New York Times", rss: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", bias: -1, credibility: 85, topic_focus: "us" },
  { name: "Fox News",        rss: "https://moxie.foxnews.com/google-publisher/latest.xml", bias: 2,  credibility: 68, topic_focus: "us" },
  { name: "New York Post",   rss: "https://nypost.com/feed/",                              bias: 1,  credibility: 62, topic_focus: "us" },
  { name: "The Wall Street Journal", rss: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",   bias: 1,  credibility: 86, topic_focus: "business" },
  { name: "Al Jazeera",      rss: "https://www.aljazeera.com/xml/rss/all.xml",             bias: -1, credibility: 80, topic_focus: "world" },
  { name: "The Economist",   rss: "https://www.economist.com/international/rss.xml",       bias: 0,  credibility: 88, topic_focus: "world" }
];
