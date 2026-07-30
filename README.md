# NewsHub — A Perspective-Diverse News Aggregator

NewsHub pulls stories from multiple news sources, automatically groups
articles that cover the *same* real-world event into a **story cluster**,
and shows that cluster's coverage side-by-side by political lean
(left / center / right) with a computed **Perspective Diversity Score**.
The goal: reduce single-source framing effects by making it effortless to
see how a story is being covered across the spectrum before forming an
opinion.

This is the working prototype for a final-year research project. See
`Research_Report.docx` for the full write-up (problem statement, literature
gap, methodology, system design, and evaluation).

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — file-based, no server to install
- **Views:** EJS + `express-ejs-layouts`
- **Auth:** `express-session` (SQLite-backed store) + `bcryptjs` password hashing
- **News ingestion:** `rss-parser` pulling live RSS feeds, `node-cron` for scheduled refresh
- **Styling:** custom CSS design system + Bootstrap 5 (CDN) grid/utility helpers

## Features

- Multi-source RSS ingestion with automatic story clustering (keyword-overlap algorithm)
- Perspective Diversity Score (0–100) per story, based on viewpoint spread + source credibility
- Left / Center / Right "perspective lanes" view for every story
- Full user accounts: register, login, logout (hashed passwords, sessions persisted in SQLite)
- Bookmarks, reading history, and topic preferences — all persisted across sessions
- Topic filtering, search, personalized dashboard
- Fully responsive layout (mobile, tablet, desktop) with a reasonably complex page structure
  (sticky navbar, sidebar, multi-column grids, footer)
- Works fully offline out of the box via seeded demo data (see below) — live RSS fetching
  is additive, not required for grading/demo

## Getting started

### 1. Install dependencies

```bash
cd newshub
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# edit .env if you want to change the port, session secret, or refresh interval
```

### 3. Seed the database

This creates `newshub.sqlite3`, loads the source list, and seeds demo story
clusters (multi-perspective sample articles) so the app is fully functional
immediately — no internet connection required for the demo/grading session.

```bash
npm run seed
```

### 4. (Optional) Pull live news

Requires internet access. Populates real, current articles from the RSS
feeds in `data/sources.js`, clustering them automatically.

```bash
npm run fetch-news
```

### 5. Run the app

```bash
npm start
```

Visit **http://localhost:3000**.

While the server is running, live feeds also refresh automatically every
`NEWS_REFRESH_MINUTES` (default 30).

## Project structure

```
newshub/
├── server.js              # App entry point, middleware, routing
├── config/db.js           # SQLite connection + schema
├── data/
│   ├── sources.js         # Curated source list with bias/credibility ratings
│   └── seed.js            # Seeds sources + offline demo articles
├── middleware/auth.js     # Session auth guards
├── routes/
│   ├── auth.js            # Register / login / logout
│   ├── news.js            # Home, feed, story detail, search
│   └── user.js            # Dashboard, bookmarks, history, preferences
├── services/
│   ├── biasEngine.js      # Clustering + Perspective Diversity Score (core logic)
│   └── newsFetcher.js     # RSS ingestion
├── views/                 # EJS templates + partials
└── public/                # CSS, JS, images
```

## Notes on the bias/credibility ratings

The `bias` and `credibility` values in `data/sources.js` are illustrative
approximations modeled on public media-bias methodologies (e.g. AllSides,
Ad Fontes Media) for the purpose of demonstrating the clustering and
diversity-scoring algorithm. They are not presented as a definitive or
final judgement of any outlet — see Section 4.3 of the research report
for a full discussion and suggested production alternative (a licensed
bias-rating API).

## Validating the HTML

Every page is rendered server-side as standard HTML5 with a single external
stylesheet (`public/css/style.css`). To validate: start the server, view
source on any page, and paste it into the [W3C Markup Validator](https://validator.w3.org/#validate_by_input).

## Known limitations / future work

- Clustering uses keyword-overlap (Jaccard similarity) rather than a full
  NLP/embedding model — sufficient for demo scale, documented as a
  future-work item in the report.
- Bias/credibility labels are static and manually curated rather than
  pulled from a live third-party rating API.
- Session store and rate limiting are configured for demo/dev use, not
  hardened for production deployment.
