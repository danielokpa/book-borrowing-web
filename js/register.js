const API_BASE_URL = "http://localhost:3000";

const form = document.getElementById("registerForm");
const fullNameEl = document.getElementById("fullName");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const confirmPasswordEl = document.getElementById("confirmPassword");
const registerBtn = document.getElementById("registerBtn");

const errorEl = document.getElementById("registerError");
const successEl = document.getElementById("registerSuccess");

function setLoading(isLoading) {
  if (!registerBtn) return;
  registerBtn.disabled = isLoading;
  registerBtn.textContent = isLoading ? "Creating..." : "Create Account";
}

function showError(message) {
  if (successEl) successEl.style.display = "none";
  if (!errorEl) return alert(message);
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function showSuccess(message) {
  if (errorEl) errorEl.style.display = "none";
  if (!successEl) return alert(message);
  successEl.textContent = message;
  successEl.style.display = "block";
}

function clearMessages() {
  if (errorEl) errorEl.style.display = "none";
  if (successEl) successEl.style.display = "none";
}

async function apiSignup(payload) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let json = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    json = await res.json().catch(() => null);
  }

  if (!res.ok) {
    // Typical Nest response: { message, error, statusCode } OR your ResponseUtil wrapper
    const msg =
      json?.message ||
      json?.error ||
      json?.data?.message ||
      `Signup failed (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return json;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  const fullName = (fullNameEl?.value || "").trim();
  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = passwordEl?.value || "";
  const confirmPassword = confirmPasswordEl?.value || "";

  // Basic validations
  if (!fullName || fullName.length < 3) {
    showError("Full name must be at least 3 characters.");
    return;
  }

  if (!email || !email.includes("@")) {
    showError("Please enter a valid email address.");
    return;
  }

  if (!password || password.length < 6) {
    showError("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  try {
    setLoading(true);

    const response = await apiSignup({ fullName, email, password });

    // If you're using ResponseUtil, likely shape is: { status, message, data }
    const msg = response?.message || "Signup successful. Redirecting...";
    showSuccess(msg);

    // Optional: clear form
    form.reset();

    // Redirect to login
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  } catch (err) {
    showError(err?.message || "Unable to create account.");
  } finally {
    setLoading(false);
  }
});