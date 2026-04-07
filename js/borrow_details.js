const API_BASE_URL = "https://book-borrowing-system.onrender.com";
// const API_BASE_URL = "http://localhost:3000";

const LIB_FEE_PER_BOOK = 100;
let currentDeliveryFee = 0;
let bookCount = 0;

/* ---------------- AUTH ---------------- */

function getToken() {
  return localStorage.getItem("bbs_access_token");
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("bbs_refresh_token");

  if (!refreshToken) {
    window.location.href = "login.html";
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ refreshToken })
  });

  const json = await res.json();

  if (!res.ok) throw new Error("Refresh failed");

  const data = json.data ?? json;

  localStorage.setItem("bbs_access_token", data.accessToken);
  localStorage.setItem("bbs_refresh_token", data.refreshToken);

  return data.accessToken;
}

/* ---------------- FETCH WRAPPER ---------------- */

async function fetchWithAuth(url, options = {}) {
  let token = getToken();

  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let res = await fetch(url, options);

  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();

      options.headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, options);
    } catch (err) {
      window.location.href = "login.html";
      throw err;
    }
  }

  return res;
}

/* ---------------- TOAST ---------------- */

function showToast(message, type="success") {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

/* ---------------- LOAD USER PROFILE ---------------- */

async function loadUserProfile() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/users/profile`);
    const json = await res.json();

    const user = json.data;

    document.getElementById("custName").value = user.fullName || "";
    document.getElementById("custPhone").value = user.phoneNumber || "";
    document.getElementById("custID").value = user.matricNumber || "";
    document.getElementById("custDept").value = user.department || "";

  } catch (err) {
    console.error(err);
  }
}

/* ---------------- LOAD CART SUMMARY ---------------- */

async function loadCartSummary() {
  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart`);
    const json = await res.json();

    const cart = json.data;

    bookCount = cart.items.length;

    updateCalculations();

  } catch (err) {
    console.error(err);
    showToast("Failed to load cart", "error");
  }
}

/* ---------------- CALCULATIONS ---------------- */

function updateCalculations() {
  const totalLibFee = bookCount * LIB_FEE_PER_BOOK;
  const total = totalLibFee + currentDeliveryFee;

  document.getElementById("bookCount").textContent = bookCount;
  document.getElementById("libFeeDisplay").textContent = `₦${totalLibFee}`;
  document.getElementById("serviceFee").textContent = `₦${currentDeliveryFee}`;
  document.getElementById("totalDisplay").textContent = `₦${total.toFixed(2)}`;
}

/* ---------------- DELIVERY ---------------- */

function selectOption(element, type) {
  const cards = element.parentElement.querySelectorAll(".option-card");
  cards.forEach(c => c.classList.remove("active"));
  element.classList.add("active");

  if (type === "delivery") {
    currentDeliveryFee = Number(element.dataset.fee || 0);
    updateCalculations();
  }
}

window.selectOption = selectOption;

/* ---------------- PROCESS ORDER ---------------- */

async function processOrder() {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const matric = document.getElementById("custID").value.trim();
  const dept = document.getElementById("custDept").value.trim();

  if (!name || !phone) {
    showToast("Please fill required fields", "error");
    return;
  }

  const btn = document.getElementById("confirmBtn");
  const loader = document.getElementById("loader");
  const btnText = document.getElementById("btnText");

  btn.disabled = true;
  loader.style.display = "inline-block";
  btnText.textContent = "Processing...";

  try {

    const res = await fetchWithAuth(`${API_BASE_URL}/borrows/confirm`, {
      method: "POST",
      body: JSON.stringify({
        borrowPeriodDays: 14,
        deliveryFee: currentDeliveryFee,
        fullName: name,
        phoneNumber: phone,
        matricNumber: matric,
        department: dept
      })
    });

    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    showToast("Borrowing successful 🎉");
    console.log('Success data: ', json);
    sessionStorage.setItem('borrow_success', JSON.stringify(json?.data));

    btnText.textContent = "Success!";

    console.log('json: ', json);
    setTimeout(() => {
      // Instead of just success.html
      window.location.href = `success.html?orderId=${json.data.borrowBatchId}`;

    }, 1200);

  } catch (err) {
    console.error(err);
    showToast("Failed to process order", "error");

    btn.disabled = false;
    loader.style.display = "none";
    btnText.textContent = "Confirm Borrowing";
  }
}

window.processOrder = processOrder;

/* ---------------- INIT ---------------- */

async function init() {
  await loadUserProfile();
  await loadCartSummary();
}

init();