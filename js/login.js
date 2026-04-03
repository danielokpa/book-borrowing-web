// Example: https://your-backend.onrender.com
const API_BASE_URL = "http://localhost:3000";

const loginForm = document.getElementById("loginForm");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginErrorEl = document.getElementById("loginError");

function setLoading(isLoading) {
  if (!loginBtn) return;
  loginBtn.disabled = isLoading;
  loginBtn.textContent = isLoading ? "Signing in..." : "Sign in";
}

function showError(message) {
  if (!loginErrorEl) {
    alert(message);
    return;
  }
  loginErrorEl.textContent = message;
  loginErrorEl.style.display = "block";
}

function clearError() {
  if (!loginErrorEl) return;
  loginErrorEl.textContent = "";
  loginErrorEl.style.display = "none";
}

function saveAccessToken(token) {
  localStorage.setItem("bbs_access_token", token);
}

function saveRefreshToken(token) {
  localStorage.setItem("bbs_refresh_token", token);
}

function saveExpiresIn(expiresIn) {
  // expiresIn is unix timestamp from your API (moment().add(...).unix())
  localStorage.setItem("bbs_access_expires_in", String(expiresIn));
}

async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  // Try to parse JSON (even on errors)
  let json = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    json = await res.json().catch(() => null);
  }

  if (!res.ok) {
    // Your API likely returns { message, error, statusCode }
    const msg =
      json?.message ||
      json?.error ||
      `Login failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return json;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = passwordEl?.value || "";

  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  try {
    setLoading(true);

    const response = await apiLogin(email, password);
    console.log('Response: ', response);

    /**
     * Your ResponseUtil likely wraps payload like:
     * { status: true, message: "...", data: { accessToken, expiresIn } }
     * Adjust below if your shape is different.
     */
    const payload = response?.data ?? response;

    const accessToken = payload?.accessToken;
    const refreshToken = payload?.refreshToken;
    const expiresIn = payload?.expiresIn;

    if (!accessToken) {
      throw new Error("Login response missing access token.");
    }

    saveAccessToken(accessToken);
    if (refreshToken) saveRefreshToken(refreshToken);
    if (expiresIn) saveExpiresIn(expiresIn);

    loginForm?.reset();

    // Redirect to dashboard/home page
    window.location.href = "dashboard.html"; // change to your page
  } catch (err) {
    showError(err?.message || "Unable to sign in.");
  } finally {
    setLoading(false);
  }
});

// async function refreshAccessToken() {
//   const refreshToken = localStorage.getItem("bbs_refresh_token");
//   if (!refreshToken) throw new Error("No refresh token");

//   const res = await fetch(`http://localhost:3000/auth/refresh`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ refreshToken }),
//   });

//   const json = await res.json();
//   if (!res.ok) throw new Error(json?.message || "Refresh failed");

//   const data = json.data ?? json;

//   localStorage.setItem("bbs_access_token", data.accessToken);
//   localStorage.setItem("bbs_refresh_token", data.refreshToken); // rotated
//   localStorage.setItem("bbs_expires_in", String(data.expiresIn));

//   return data.accessToken;
// }