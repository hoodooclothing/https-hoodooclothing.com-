// ── Admin Auth Gate ──
// Redirects to login page if not authenticated.
// Uses a cookie (30 day expiry) so the device stays logged in.
(function () {
  var allowed = ["footy1x.ae@gmail.com", "theodorejamespeck@gmail.com"];
  var cookie = document.cookie.split("; ").find(function (c) { return c.startsWith("hoodoo_admin="); });
  var saved = cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
  if (!saved || allowed.indexOf(saved) === -1) {
    window.location.href = "/admin/login.html";
  }
})();

// ── Logout ──
function logout() {
  document.cookie = "hoodoo_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.location.href = "/admin/login.html";
}
