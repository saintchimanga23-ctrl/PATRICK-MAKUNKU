const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const db = require("../config/db");
const { redirectIfAuthed } = require("../middleware/auth");

const router = express.Router();

router.get("/register", redirectIfAuthed, (req, res) => {
  res.render("register", { title: "Create an account", errors: [], old: {} });
});

router.post(
  "/register",
  redirectIfAuthed,
  [
    body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters"),
    body("email").trim().isEmail().withMessage("Please provide a valid email address"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { username, email, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("register", {
        title: "Create an account",
        errors: errors.array(),
        old: { username, email }
      });
    }

    const existing = await db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
    if (existing) {
      return res.status(400).render("register", {
        title: "Create an account",
        errors: [{ msg: "Username or email is already registered" }],
        old: { username, email }
      });
    }

    const hash = bcrypt.hashSync(password, 10);
    const info = await db
      .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
      .run(username, email, hash);

    await db.prepare("INSERT INTO user_preferences (user_id, topics, balance_mode) VALUES (?, '[]', 1)").run(
      info.lastInsertRowid
    );

    req.session.user = { id: info.lastInsertRowid, username, email };
    res.redirect("/account/dashboard");
  }
);

router.get("/login", redirectIfAuthed, (req, res) => {
  res.render("login", { title: "Log in", errors: [], old: {} });
});

router.post("/login", redirectIfAuthed, async (req, res) => {
  const { username, password } = req.body;
  const user = await db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(username, username);

  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(400).render("login", {
      title: "Log in",
      errors: [{ msg: "Invalid username or password" }],
      old: { username }
    });
  }

  req.session.user = { id: user.id, username: user.username, email: user.email };
  const dest = req.session.returnTo || "/account/dashboard";
  delete req.session.returnTo;
  res.redirect(dest);
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
