// const API_BASE_URL = "http://localhost:3000";
const API_BASE_URL = "https://book-borrowing-system.onrender.com";

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', () => {
  loadSuccessData();
});

/* ================= TOKEN ================= */

function getToken() {
  return localStorage.getItem("bbs_access_token");
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("bbs_refresh_token");

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ refreshToken })
  });

  const json = await res.json();

  localStorage.setItem("bbs_access_token", json.data.accessToken);
  localStorage.setItem("bbs_refresh_token", json.data.refreshToken);

  return json.data.accessToken;
}

/* ================= LOAD SUCCESS DATA ================= */

async function loadSuccessData() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  let data = sessionStorage.getItem("borrow_success");

  if (data) {
    console.log('data from session: ', data);
    renderSuccess(JSON.parse(data));
    // Optional: sessionStorage.removeItem("borrow_success");
    return;
  }

  // 2. If no session data, but we have an ID, fetch specific record
  // if (orderId) {
  //   await fetchSpecificOrder(orderId);
  // } else {
  //   // 3. Last resort: Get the most recent active borrow
  //   await fetchFromBackend();
  //   return;
  // }
  // If user refreshes page → fallback to API
  if (!data) {
    await fetchFromBackend();
    return;
  }

  data = JSON.parse(data);

  renderSuccess(data);
}

/* ================= FETCH FALLBACK ================= */

async function fetchSpecificOrder(id) {
  let token = getToken();
  try {
    const res = await fetch(`${API_BASE_URL}/users/borrows/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.data) renderFallback(json.data);
  } catch (err) {
    console.error("Failed to fetch specific order:", err);
  }
}


async function fetchFromBackend() {

  let token = getToken();

  try {
    let res = await fetch(`${API_BASE_URL}/users/borrows/active`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      token = await refreshAccessToken();

      res = await fetch(`${API_BASE_URL}/users/borrows/active`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    const json = await res.json();

    // Get latest borrow
    const latest = json.data?.[json.data.length - 1];

    if (!latest) return;

    renderFallback(latest);

  } catch (err) {
    console.error(err);
  }
}

/* ================= RENDER ================= */

function renderSuccess(data) {

  console.log('Success data: ', data);
  document.getElementById("orderId").textContent =
    data.borrowBatchId || "G7-BBS-XXXX";

  document.getElementById("finalCharge").textContent =
    "₦" + (data.totalFee || 0).toFixed(2);

  document.getElementById("returnDate").textContent =
    formatDate(data.dueAt || data?.borrowed?.[0].dueAt);

  // clear after use (optional)
  sessionStorage.removeItem("borrow_success");
}

/* ================= FALLBACK RENDER ================= */

function renderFallback(borrow) {

  document.getElementById("orderId").textContent =
    borrow.id || "G7-BBS-XXXX";

  document.getElementById("finalCharge").textContent =
    "₦" + (borrow.fee || 0).toFixed(2);

  document.getElementById("returnDate").textContent =
    formatDate(borrow.dueAt);
}

/* ================= UTIL ================= */

function formatDate(dateStr) {
  if (!dateStr) return "—";

  const date = new Date(dateStr);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
