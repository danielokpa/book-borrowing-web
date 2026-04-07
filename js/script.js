const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");
const productGrid = document.getElementById("productGrid");
const cartCountElement = document.getElementById("cart-count");

// Load stored data
let borrowedBooks = JSON.parse(localStorage.getItem("borrowedBooks")) || [];

// Initial UI setup
updateCartUI();
checkExistingBorrowed();

// 1. Search & Filter Logic
function filterBooks() {
  const term = searchInput.value.toLowerCase();
  const cat = categorySelect.value;
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const title = card.getAttribute("data-title").toLowerCase();
    const category = card.getAttribute("data-category");
    const matchesSearch = title.includes(term);
    const matchesCategory = cat === "" || category === cat;

    card.style.display = matchesSearch && matchesCategory ? "flex" : "none";
  });
}

searchInput.oninput = filterBooks;
categorySelect.onchange = filterBooks;

// 2. Borrowing Action
productGrid.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON" && !e.target.disabled) {
    const button = e.target;
    const card = button.closest(".product-card");
    const badge = card.querySelector(".badge");

    const bookData = {
      title: card.getAttribute("data-title"),
      author: card.getAttribute("data-author"),
      image: card.querySelector("img").src,
    };

    // Save to LocalStorage
    borrowedBooks.push(bookData);
    localStorage.setItem("borrowedBooks", JSON.stringify(borrowedBooks));

    // Update UI state to "Borrowed"
    setBorrowedState(button, badge);
    updateCartUI();
  }
});

// 3. Helper: Set UI to Borrowed
function setBorrowedState(button, badge) {
  button.innerText = "Borrowed";
  button.disabled = true;
  badge.innerText = "Borrowed";
  badge.className = "badge borrowed"; // Changes color to red
}

// 4. Update Header Cart Count
function updateCartUI() {
  const count = borrowedBooks.length;
  if (cartCountElement) {
    cartCountElement.innerText = count;
    cartCountElement.style.display = count > 0 ? "block" : "none";
  }
}

// 5. Check if books were already borrowed (on refresh)
function checkExistingBorrowed() {
  const cards = document.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const title = card.getAttribute("data-title");
    const isBorrowed = borrowedBooks.some((b) => b.title === title);

    if (isBorrowed) {
      const button = card.querySelector("button");
      const badge = card.querySelector(".badge");
      setBorrowedState(button, badge);
    }
  });
}
