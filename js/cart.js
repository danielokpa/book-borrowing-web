const API_BASE_URL = "https://book-borrowing-system.onrender.com";
// const API_BASE_URL = "http://localhost:3000";
const IMAGE_BASE_URL = `${API_BASE_URL}/uploads`;

const itemList = document.getElementById("itemList");
const totalCountElement = document.getElementById("totalCount");
const emptyState = document.getElementById("emptyState");
const confirmBorrowBtn = document.getElementById("confirmBorrowBtn");

function getToken() {
  return localStorage.getItem("bbs_access_token");
}

async function refreshAccessToken() {
  const token = getToken();
  const refreshToken = localStorage.getItem("bbs_refresh_token");

  if (!refreshToken) {
    window.location.href = "login.html";
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":"application/json",
    },
    body: JSON.stringify({ refreshToken })
  });

  const json = await res.json();
  console.log('res: ', json);

  if (!res.ok) throw new Error(json?.message || "Refresh failed");

  const data = json.data ?? json;

  localStorage.setItem("bbs_access_token", data.accessToken);
  localStorage.setItem("bbs_refresh_token", data.refreshToken);
  localStorage.setItem("bbs_expires_in", String(data.expiresIn));

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
      console.log('Error: ', err);
      if (err.statusCode === 401) window.location.href = "login.html";
      throw err;
    }
  }

  return res;
}

function showMessage(message) {
  itemList.innerHTML = `
    <div class="empty-cart">
      <h3>${message}</h3>
    </div>
  `;
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function showLoading() {
  itemList.innerHTML = `
    <div class="empty-cart">
      <h3>Loading cart...</h3>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setConfirmButtonState(disabled, text = "Confirm Borrowing") {
  if (!confirmBorrowBtn) return;
  confirmBorrowBtn.disabled = disabled;
  confirmBorrowBtn.textContent = text;
}

async function fetchCart() {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  showLoading();
  setConfirmButtonState(true, "Loading...");

  try {
    const res = await fetchWithAuth(`${API_BASE_URL}/cart`, {
      method: "GET",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      console.log('error ', json);
      // throw new Error(json.statusCode == 401 ? "Login session expired...please login again" : json?.message || "Failed to fetch cart");
    }

    // If token expired → refresh it
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();

      console.log('Resfreshing....')
      if (refreshed) {
        token = getToken();

        const res = await fetch(`${API_BASE_URL}/cart`,{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`
          },
          body:JSON.stringify({bookId})
        });

        // options.headers.Authorization = `Bearer ${token}`;
        // response = await fetch(url, options);
      } else {
        logoutUser();
      }
    }

    const data = json?.data ?? {};
    renderCart(data);
  } catch (err) {
    console.error("Cart fetch error:", err);
    showMessage(err.message || "Unable to load cart.");
    totalCountElement.textContent = "0";
    setConfirmButtonState(true, "Confirm Borrowing");
  }
}

function renderCart(data) {
  const items = data?.items || [];
  const summary = data?.summary || {};

  itemList.innerHTML = "";

  if (items.length === 0) {
    if (emptyState) {
      emptyState.style.display = "block";
      itemList.appendChild(emptyState);
    } else {
      showMessage("Your cart is empty");
    }

    totalCountElement.textContent = "0";
    setConfirmButtonState(true, "Confirm Borrowing");
    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  items.forEach((item) => {
    const book = item.book || {};
    const imageUrl = book.coverImageUrl ? `${IMAGE_BASE_URL}/${book.coverImageUrl}` : '/assets/images/IMG-20260209-WA0042.jpg';

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";

    itemDiv.innerHTML = `
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(book.title)}">
      <div class="item-details">
        <h4>${escapeHtml(book.title)}</h4>
        <p>${escapeHtml(book.author)}</p>
      </div>
      <button class="remove-btn" data-item-id="${escapeHtml(item.id)}">Remove</button>
    `;

    const img = itemDiv.querySelector("img");
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => {
      img.src = "/assets/images/IMG-20260209-WA0042.jpg";
    };
    const removeBtn = itemDiv.querySelector(".remove-btn");
    removeBtn.addEventListener("click", () => removeItem(item.id, removeBtn));

    itemList.appendChild(itemDiv);
  });

  totalCountElement.textContent = String(summary.totalBooks ?? items.length);
  setConfirmButtonState(false, "Confirm Borrowing");
}

async function removeItem(itemId, buttonEl) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.textContent = "Removing...";
    }

    const res = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json.statusCode == 401 ? "Login session expired...please login again" : json?.message || "Failed to remove item");
    }

    await fetchCart();
  } catch (err) {
    console.error("Remove item error:", err);
    showToast(err.message || "Unable to remove item", "error");

    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = "Remove";
    }
  }
}

async function confirmBorrowing() {
  const token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    setConfirmButtonState(true, "Confirming...");

    const res = await fetch(`${API_BASE_URL}/borrows/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        borrowPeriodDays: 14,
      }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json.statusCode == 401 ? "Login session expired...please login again" : json?.message || "Failed to confirm borrowing");
    }

    const data = json?.data ?? {};
    const borrowedCount = data?.borrowed?.length ?? 0;
    const failedCount = data?.failed?.length ?? 0;

    if (borrowedCount > 0 && failedCount === 0) {
      showToast(`Borrowed ${borrowedCount} book(s) successfully`);
    } else if (borrowedCount > 0 && failedCount > 0) {
      showToast(
        `${borrowedCount} books borrowed, ${failedCount} failed`,
        "error"
      );
    } else {
      showToast("No books were borrowed", "error");
    }

    await fetchCart();

    // optional redirect
    // window.location.href = "/dashboard.html";
  } catch (err) {
    console.error("Confirm borrowing error:", err);
    showToast(err.message || "Unable to confirm borrowing", "error");
    setConfirmButtonState(false, "Confirm Borrowing");
  }
}

if (confirmBorrowBtn) {
  confirmBorrowBtn.addEventListener("click", confirmBorrowing);
}

fetchCart(); 
