// const API = "https://book-borrowing-system.onrender.com/users";
const API_BASE_URL = "https://book-borrowing-system.onrender.com";
const API = "https://book-borrowing-system.onrender.com/users";
// const API_BASE_URL = "http://localhost:3000";
const cartCountEl = document.getElementById("cart-count");

function getToken() {
  return localStorage.getItem("bbs_access_token");
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

function isLoggedIn() {
  return !!localStorage.getItem("bbs_access_token");
}

function updateNavAuthState() {
  const loggedIn = isLoggedIn();

  if (loginLink) {
    loginLink.style.display = loggedIn ? "none" : "inline-block";
  }

  if (registerLink) {
    registerLink.style.display = loggedIn ? "none" : "inline-block";
  }

  if (logoutBtn) {
    logoutBtn.style.display = loggedIn ? "inline-block" : "none";
  }
}

// ===== AUTH FETCH =====
async function apiFetch(url, options = {}) {
  let token = getToken();

  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  options.headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  console.log('Url: ', url);
  console.log('Options: ', options);
  let res = await fetch(url, options);

  console.log('Status: ', res.status);
  console.log('Response: ', res);
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      token = localStorage.getItem("token");
      options.headers.Authorization = `Bearer ${token}`;
      res = await fetch(url, options);
    } else {
      logoutUser();
    }
  }

  return res.json();
}

// ===== REFRESH TOKEN =====
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("bbs_refresh_token");
  if (!refreshToken) {
    window.location.replace('login.html');
    throw new Error("No refresh token");
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Refresh failed");

  const data = json.data ?? json;

  localStorage.setItem("bbs_access_token", data.accessToken);
  localStorage.setItem("bbs_refresh_token", data.refreshToken); // rotated
  localStorage.setItem("bbs_expires_in", String(data.expiresIn));

  return data.accessToken;
}
// async function refreshToken() {
//   try {
//     const refreshToken = localStorage.getItem("refreshToken");

//     const res = await fetch("http://localhost:3000/api/auth/refresh", {
//       method: "POST",
//       body: JSON.stringify({ refreshToken }),
//       headers: { "Content-Type": "application/json" },
//     });

//     const data = await res.json();
//     localStorage.setItem("token", data.data.accessToken);

//     return true;
//   } catch {
//     return false;
//   }
// }

function logoutUser() {
  localStorage.removeItem("bbs_access_token");
  localStorage.removeItem("bbs_refresh_token");
  localStorage.removeItem("bbs_expires_in");

  showToast("Logged out successfully");
  updateNavAuthState();

  setTimeout(() => {
    window.location.href = "/login.html";
  }, 700);
}

function showToast(message, type="success") {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(()=>toast.remove(),300);
  },2000);
}

// ===== LOAD PROFILE =====
async function loadProfile() {
  const res = await apiFetch(`${API}/profile`, {
    method: "GET",
  });

  console.log('User: ', res.data);
  const user = res.data;

  document.getElementById("name").innerText = user.fullName;
  document.getElementById("email").innerText = user.email;
  // document.getElementById("matric").innerText = user.matricNo || "-";
  // document.getElementById("phone").innerText = user.phoneNumber || "-";
}

// ===== METRICS =====
async function loadMetrics() {
  const res = await apiFetch(`${API}/dashboard/metrics`, {
    method: "GET",
  });

  console.log('Res: ', res.data);

  document.getElementById("totalBorrowed").innerText = res.data.totalBorrows;
  document.getElementById("activeBorrowed").innerText = res.data.activeBorrows;
  document.getElementById("overdue").innerText = res.data.overdueBorrows;
}

// ===== ACTIVE BORROWS =====
async function loadActive() {
  const res = await apiFetch(`${API}/borrows/active`, {
    method: "GET",
  });

  const container = document.getElementById("activeList");
  container.innerHTML = "";

  res.data.forEach(b => {
    container.innerHTML += `
      <div class="list-item">
        ${b.book.title} - Due: ${new Date(b.dueAt).toDateString()}
      </div>
    `;
  });
}

// ===== HISTORY =====
async function loadHistory() {
  const res = await apiFetch(`${API}/borrows/history?page=1&limit=5`, {
    method: "GET",
  });

  const container = document.getElementById("historyList");
  container.innerHTML = "";

  res.data.items.forEach(b => {
    container.innerHTML += `
      <div class="list-item">
        ${b.book.title} - ${b.status}
      </div>
    `;
  });
}

// ===== PASSWORD =====
function openPasswordModal() {
  document.getElementById("passwordModal").classList.add("show");
}

function closePasswordModal() {
  document.getElementById("passwordModal").classList.remove("show");
}

async function changePassword() {
  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;

  const res = await apiFetch(`${API}/password`, {
    method: "PATCH",
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (res.statusCode !== 200) {
    showToast("Failed to update password", "error");
  } else {
    showToast("Password updated");
  }
  closePasswordModal();
}

async function loadCartCount(){

  const token = getToken();
  if(!token) return;

  try{

    const res = await fetch(`${API_BASE_URL}/cart/count`,{
      headers:{Authorization:`Bearer ${token}`}
    });

    // If token expired → refresh it
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        token = getToken();

        const res = await fetch(`${API_BASE_URL}/cart/count`,{
          method:"POST",
          headers:{
            Authorization:`Bearer ${token}`
          },
        });

        // options.headers.Authorization = `Bearer ${token}`;
        // response = await fetch(url, options);
      } else {
        logoutUser();
      }
    }

    console.log('res cart: ', res);
    const json = await res.json();

    const count = json.data.count;

    cartCountEl.textContent=count;

  } catch(err){
    console.error(err);
  }
}


// ===== INIT =====
updateNavAuthState()
loadProfile();
loadMetrics();
loadActive();
loadHistory();
loadCartCount();