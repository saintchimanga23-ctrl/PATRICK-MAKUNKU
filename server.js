require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const expressLayouts = require("express-ejs-layouts");
const cron = require("node-cron");

const db = require("./config/db");
const { attachUser } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const newsRoutes = require("./routes/news");
const userRoutes = require("./routes/user");
const { fetchAllSources } = require("./services/newsFetcher");

const app = express();
const isVercel = Boolean(process.env.VERCEL || process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;

if (isVercel) {
  app.set("trust proxy", 1);
}

// ---------------------------------------------------------------------------
// View engine
// ---------------------------------------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// ---------------------------------------------------------------------------
// Core middleware
// ---------------------------------------------------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const sessionOptions = {
  store: new pgSession({
    pool: db.pool,
    tableName: "session",
    createTableIfMissing: true
  }),
  proxy: isVercel,
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: isVercel,
    sameSite: "lax"
  }
};

app.use(session(sessionOptions));

app.use(attachUser);

// Small helper available in all views
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/", newsRoutes);
app.use("/", authRoutes);
app.use("/account", userRoutes);

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).render("404", { title: "Page not found" });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("500", { title: "Something went wrong", message: err.message });
});

// ---------------------------------------------------------------------------
// Scheduled news refresh (every N minutes, default 30)
// ---------------------------------------------------------------------------
const refreshMinutes = Number(process.env.NEWS_REFRESH_MINUTES) || 30;

if (require.main === module && !isVercel) {
  cron.schedule(`*/${refreshMinutes} * * * *`, () => {
    console.log("[cron] Refreshing news feeds...");
    fetchAllSources().catch((err) => console.error("[cron] fetch failed:", err.message));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NewsHub running at http://localhost:${PORT}`);
    console.log(`News feeds refresh every ${refreshMinutes} minutes.`);
  });
}

module.exports = app;
