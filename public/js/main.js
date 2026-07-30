document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".bookmark-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const articleId = btn.getAttribute("data-article-id");
      if (!articleId) return;

      btn.disabled = true;
      try {
        const res = await fetch(`/account/bookmarks/${articleId}/toggle`, {
          method: "POST",
          headers: { "X-Requested-With": "fetch" }
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        if (data.bookmarked) {
          btn.textContent = "★ Saved";
          btn.classList.add("active");
        } else {
          // On the bookmarks page, remove the whole row when un-bookmarked
          const row = btn.closest(".search-result-row");
          if (row && window.location.pathname === "/account/bookmarks") {
            row.remove();
          } else {
            btn.textContent = "☆ Save";
            btn.classList.remove("active");
          }
        }
      } catch (err) {
        console.error("Bookmark toggle failed", err);
      } finally {
        btn.disabled = false;
      }
    });
  });
});
