function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.headers["x-requested-with"] === "fetch") {
      return res.status(401).json({ error: "login_required" });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect("/login");
  }
  next();
}

function redirectIfAuthed(req, res, next) {
  if (req.session.user) return res.redirect("/account/dashboard");
  next();
}

module.exports = { attachUser, requireAuth, redirectIfAuthed };
