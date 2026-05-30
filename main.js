"use strict";

const OPENAI_API_KEY = "placeholder";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

async function callOpenAI(messages, maxTokens = 300, jsonMode = false) {
  const payload = {
    model: OPENAI_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: jsonMode ? 0.2 : 0.7,
  };

  if (jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error?.message || `HTTP error ${res.status}`);
  }

  const data = await res.json();

  return data.choices?.[0]?.message?.content?.trim() || "No response received.";
}

class BasketStore {
  constructor(items = []) {
    this._items = items;
  }

  static fromStorage() {
    try {
      const raw = localStorage.getItem("fram_basket");
      const items = raw ? JSON.parse(raw) : [];
      return new BasketStore(items);
    } catch {
      return new BasketStore([]);
    }
  }

  save() {
    localStorage.setItem("fram_basket", JSON.stringify(this._items));
    return this; // enables method chaining
  }

  get items() {
    return [...this._items];
  }

  get count() {
    return this._items.reduce((s, i) => s + i.qty, 0);
  }
  get total() {
    return this._items.reduce((s, i) => s + i.price * i.qty, 0);
  }
  get isEmpty() {
    return this._items.length === 0;
  }

  add(product) {
    const { id, name, price, unit, img } = product;
    const existing = this._items.find((i) => i.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      this._items.push({ id, name, price, unit, img, qty: 1 });
    }
    return this.save();
  }

  remove(id) {
    this._items = this._items.filter((i) => i.id !== id);
    return this.save();
  }

  changeQty(id, delta) {
    const item = this._items.find((i) => i.id === id);
    if (!item) return this;
    item.qty = Math.max(0, item.qty + delta);
    if (item.qty === 0) return this.remove(id);
    return this.save();
  }

  clear() {
    this._items = [];
    return this.save();
  }

  setItems(items) {
    this._items = items;
    return this;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

loadImage("header_image.jpg")
  .then(({ src, width, height }) => {
    console.log(`[Fram] Hero image ready: ${width}×${height}px`);
  })
  .catch((err) => {
    console.warn("[Fram]", err.message);
  });

const PRODUCTS = [
  {
    id: 1,
    name: "Oats",
    weight: "1 kg",
    price: 16,
    unit: "kg",
    img: "oats.jpg",
    category: "grains",
  },
  {
    id: 2,
    name: "Red Onions",
    weight: "1 kg",
    price: 45,
    unit: "kg",
    img: "red_onions.jpg",
    category: "vegetables",
  },
  {
    id: 3,
    name: "Garlic",
    weight: "0.2 kg",
    price: 38,
    unit: "",
    img: "garlic.jpg",
    category: "vegetables",
  },
  {
    id: 4,
    name: "Potato",
    weight: "1 kg",
    price: 32,
    unit: "kg",
    img: "potatoes.jpg",
    category: "vegetables",
  },
  {
    id: 5,
    name: "Carrots",
    weight: "1 kg",
    price: 48,
    unit: "kg",
    img: "carrots.jpg",
    category: "vegetables",
  },
];

let basket = BasketStore.fromStorage();

function addToBasket(id, name) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return;
  basket.add(product);
  updateBasketUI();
  showToast(`${name} added to basket`);

  const bd = document.getElementById("basketDrawer");
  if (bd && bd.getAttribute("aria-hidden") === "false") renderBasketItems();

  renderOrderSummary();
}

function changeQty(id, delta) {
  basket.changeQty(id, delta);
  updateBasketUI();
  renderBasketItems();
  renderOrderSummary();
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2500);
}

function updateBasketUI() {
  const count = basket.count;
  document
    .querySelectorAll("#basketCount")
    .forEach((el) => (el.textContent = count));
  document
    .querySelectorAll("#basketBtn")
    .forEach((btn) =>
      btn.setAttribute(
        "aria-label",
        `Basket, ${count} item${count !== 1 ? "s" : ""}`,
      ),
    );
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trapFocus(modal, e) {
  if (e.key !== "Tab") return;
  const focusable = modal.querySelectorAll(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function initNav() {
  const menuBtn = document.getElementById("menuBtn");
  const drawer = document.getElementById("navDrawer");
  const drawerClose = document.getElementById("drawerClose");
  const drawerOverlay = document.getElementById("drawerOverlay");
  const navEl = document.getElementById("nav");
  if (!menuBtn || !drawer) return;

  let prevFocus = null;

  function openDrawer() {
    prevFocus = document.activeElement;
    drawer.setAttribute("aria-hidden", "false");
    menuBtn.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.setAttribute("aria-label", "Close navigation menu");
    document.body.style.overflow = "hidden";
    setTimeout(() => drawerClose && drawerClose.focus(), 50);
    drawer.addEventListener("keydown", onDrawerKey);
  }

  function closeDrawer() {
    drawer.setAttribute("aria-hidden", "true");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open navigation menu");
    document.body.style.overflow = "";
    drawer.removeEventListener("keydown", onDrawerKey);
    if (prevFocus) prevFocus.focus();
  }

  function onDrawerKey(e) {
    if (e.key === "Escape") closeDrawer();
    else trapFocus(drawer, e);
  }

  menuBtn.addEventListener("click", () =>
    drawer.getAttribute("aria-hidden") === "false"
      ? closeDrawer()
      : openDrawer(),
  );
  drawerClose && drawerClose.addEventListener("click", closeDrawer);
  drawerOverlay && drawerOverlay.addEventListener("click", closeDrawer);

  if (navEl) {
    window.addEventListener(
      "scroll",
      () => navEl.classList.toggle("scrolled", window.scrollY > 8),
      { passive: true },
    );
  }
}
(function () {
  const s = document.createElement("style");
  s.textContent = ".nav.scrolled { box-shadow: 0 2px 12px rgba(11,10,8,.1); }";
  document.head.appendChild(s);
})();

function initAddToBasket() {
  document.querySelectorAll(".popular__grid, .produce-grid").forEach((grid) => {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".produce-card__add");
      if (!btn) return;
      const id = parseInt(btn.dataset.id);
      const name = btn
        .closest(".produce-card")
        .querySelector(".produce-card__name").textContent;
      addToBasket(id, name);
      btn.classList.add("added");
      setTimeout(() => btn.classList.remove("added"), 600);
    });
  });
}

function initHiwAccordion() {
  const steps = document.querySelectorAll(".hiw__step");
  if (!steps.length) return;

  function setupAccordion() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    steps.forEach((step, i) => {
      const title = step.querySelector(".hiw__step-name");
      const body = step.querySelector(".hiw__step-body");
      const link = step.querySelector(".hiw__link");
      if (!title || !body) return;

      if (isMobile) {
        const bodyId = `hiw-body-${i}`;
        body.id = bodyId;
        title.setAttribute("role", "button");
        title.setAttribute("tabindex", "0");
        title.setAttribute("aria-expanded", i === 0 ? "true" : "false");
        title.setAttribute("aria-controls", bodyId);
        body.style.display = i === 0 ? "" : "none";
        if (link) link.style.display = i === 0 ? "" : "none";
        title.onclick = () => toggleStep(title, body, link);
        title.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleStep(title, body, link);
          }
        };
      } else {
        title.removeAttribute("role");
        title.removeAttribute("tabindex");
        title.removeAttribute("aria-expanded");
        title.removeAttribute("aria-controls");
        title.onclick = null;
        title.onkeydown = null;
        body.style.display = "";
        if (link) link.style.display = "";
      }
    });
  }

  function toggleStep(title, body, link) {
    const isOpen = title.getAttribute("aria-expanded") === "true";

    steps.forEach((s) => {
      const t = s.querySelector(".hiw__step-name");
      const b = s.querySelector(".hiw__step-body");
      const l = s.querySelector(".hiw__link");
      if (t) t.setAttribute("aria-expanded", "false");
      if (b) b.style.display = "none";
      if (l) l.style.display = "none";
    });

    if (!isOpen) {
      title.setAttribute("aria-expanded", "true");
      body.style.display = "";
      if (link) link.style.display = "";
    }
  }

  setupAccordion();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupAccordion, 200);
  });
}

function initProductFilter() {
  const chips = document.querySelectorAll(".filter-chip");
  const cards = document.querySelectorAll(".produce-card");
  const count = document.getElementById("filterCount");
  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => {
        c.classList.remove("filter-chip--active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("filter-chip--active");
      chip.setAttribute("aria-pressed", "true");

      const filter = chip.dataset.filter;
      let visible = 0;

      cards.forEach((card) => {
        const li = card.closest("li");
        const show = filter === "all" || card.dataset.category === filter;
        if (li) li.style.display = show ? "" : "none";
        if (show) visible++;
      });

      if (count)
        count.textContent =
          filter === "all"
            ? `Showing all ${visible} products`
            : `Showing ${visible} product${visible !== 1 ? "s" : ""}`;

      const aiResult = document.getElementById("aiSearchResult");
      if (aiResult) aiResult.textContent = "";
    });
  });
}

function initAISearch() {
  const input = document.getElementById("aiSearch");
  const btn = document.getElementById("aiSearchBtn");
  const resultEl = document.getElementById("aiSearchResult");
  if (!input || !btn) return;

  async function runSearch() {
    const query = input.value.trim();
    if (!query) return;

    btn.disabled = true;
    btn.textContent = "…";
    if (resultEl) resultEl.textContent = "Searching…";

    const productList = PRODUCTS.map((p) => `${p.id}: ${p.name}`).join(", ");

    const messages = [
      {
        role: "system",
        content: `You are a produce assistant for Fram, a Norwegian farm delivery service.
Available products (id: name): ${productList}
When the user describes what they want to cook or eat, return ONLY a JSON object with:
- "matchedIds": array of product IDs (integers) that match (empty array if none match)
- "explanation": one short friendly sentence explaining why these match
Never include any text outside the JSON object.`,
      },
      { role: "user", content: query },
    ];

    try {
      const rawJSON = await callOpenAI(messages, 150, true);

      let parsed;
      try {
        parsed = JSON.parse(rawJSON);
      } catch {
        throw new Error("AI returned an unexpected format. Please try again.");
      }

      const {
        matchedIds = [],
        explanation = "Here are some matching products.",
      } = parsed;

      const cards = document.querySelectorAll(".produce-card");
      let shown = 0;
      cards.forEach((card) => {
        const li = card.closest("li");
        const id = parseInt(
          card.querySelector(".produce-card__add")?.dataset.id,
        );
        const show = matchedIds.length === 0 || matchedIds.includes(id);
        if (li) li.style.display = show ? "" : "none";
        if (show) shown++;
      });

      document.querySelectorAll(".filter-chip").forEach((c) => {
        c.classList.remove("filter-chip--active");
        c.setAttribute("aria-pressed", "false");
      });

      if (resultEl) {
        resultEl.textContent = matchedIds.length
          ? `✨ ${explanation}`
          : "😔 No products matched. Try a different description.";
      }

      const countEl = document.getElementById("filterCount");
      if (countEl)
        countEl.textContent = `Showing ${shown} product${shown !== 1 ? "s" : ""}`;
    } catch (err) {
      if (resultEl) {
        resultEl.textContent = err.message?.includes("401")
          ? "⚠️ Invalid API key — add your OpenAI key to main.js"
          : `⚠️ ${err.message || "Search failed. Please try again."}`;
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>`;
    }
  }

  btn.addEventListener("click", runSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });

  input.addEventListener("input", () => {
    if (!input.value.trim() && resultEl) resultEl.textContent = "";
  });
}

function renderBasketItems() {
  const container = document.getElementById("basketItems");
  const totalEl = document.getElementById("basketTotal");
  if (!container) return;

  if (basket.isEmpty) {
    container.innerHTML = `
      <p class="basket-empty">
        Your basket is empty.<br>
        <a href="products.html" class="form-link">Browse our produce →</a>
      </p>`;
  } else {
    container.innerHTML = basket.items
      .map(
        (item) => `
      <div class="basket-item" role="listitem" aria-label="${esc(item.name)}, quantity ${item.qty}">
        <img class="basket-item__img" src="${esc(item.img)}" alt="" aria-hidden="true"/>
        <div class="basket-item__details">
          <p class="basket-item__name">${esc(item.name)}</p>
          <p class="basket-item__price">${item.price} kr${item.unit ? " / " + item.unit : ""}</p>
        </div>
        <div class="basket-item__qty" role="group" aria-label="Quantity for ${esc(item.name)}">
          <button class="qty-btn" data-id="${item.id}" data-action="dec"
                  aria-label="Decrease ${esc(item.name)}">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" data-id="${item.id}" data-action="inc"
                  aria-label="Increase ${esc(item.name)}">+</button>
        </div>
      </div>`,
      )
      .join("");

    container.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        changeQty(
          parseInt(btn.dataset.id),
          btn.dataset.action === "inc" ? 1 : -1,
        ),
      );
    });
  }

  if (totalEl) totalEl.textContent = `kr ${basket.total}`;
}

function initBasketDrawer() {
  const basketBtn = document.getElementById("basketBtn");
  const basketDrawer = document.getElementById("basketDrawer");
  const basketClose = document.getElementById("basketClose");
  const basketOverlay = document.getElementById("basketOverlay");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const checkoutLink = document.getElementById("checkoutLink");
  if (!basketDrawer) return;

  let prevFocus = null;

  function openBasket() {
    prevFocus = document.activeElement;
    basketDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderBasketItems();
    setTimeout(() => basketClose && basketClose.focus(), 50);
    basketDrawer.addEventListener("keydown", onBasketKey);
  }

  function closeBasket() {
    basketDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    basketDrawer.removeEventListener("keydown", onBasketKey);
    if (prevFocus) prevFocus.focus();
  }

  function onBasketKey(e) {
    if (e.key === "Escape") closeBasket();
    else trapFocus(basketDrawer, e);
  }

  basketBtn && basketBtn.addEventListener("click", openBasket);
  basketClose && basketClose.addEventListener("click", closeBasket);
  basketOverlay && basketOverlay.addEventListener("click", closeBasket);
  checkoutBtn &&
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "order.html";
    });
  checkoutLink &&
    checkoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "order.html";
    });
}
function initMap() {
  const mapEl = document.getElementById("map");
  const fallback = document.getElementById("mapFallback");
  if (!mapEl || typeof L === "undefined") return;
  if (fallback) fallback.style.display = "none";
  try {
    const lat = 60.2748,
      lng = 10.6134;
    const map = L.map("map", { scrollWheelZoom: false }).setView(
      [lat, lng],
      12,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup(
        "<strong>Braastad Gaard</strong><br>Oppdalslinna 242, 2740 Roa, Norway",
      )
      .openPopup();
  } catch {
    if (fallback) fallback.style.display = "flex";
  }
}

function initNewsletter() {
  document.querySelectorAll("#newsletterForm").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('[type="email"]');
      const emailError = form.querySelector('[role="alert"]');

      if (emailError) emailError.textContent = "";
      if (emailInput) emailInput.removeAttribute("aria-invalid");

      const email = emailInput ? emailInput.value.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailInput) emailInput.setAttribute("aria-invalid", "true");
        if (emailError)
          emailError.textContent = "Please enter a valid email address.";
        if (emailInput) emailInput.focus();
        return;
      }
      showToast("Thanks for signing up! 🌿");
      form.reset();
    });
  });
}

function initOrderPage() {
  if (!document.getElementById("orderForm")) return;
  renderOrderSummary();

  const msgArea = document.getElementById("message");
  const msgCount = document.getElementById("message-count");
  if (msgArea && msgCount) {
    msgArea.addEventListener("input", () => {
      const len = Math.min(msgArea.value.length, 500);
      msgCount.textContent = `${len} / 500 characters`;
      if (msgArea.value.length > 500)
        msgArea.value = msgArea.value.slice(0, 500);
    });
  }

  const form = document.getElementById("orderForm");
  form.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("blur", () => validateSingleField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true")
        validateSingleField(field);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const errors = validateOrderForm();
    const summary = document.getElementById("formErrors");
    if (errors.length > 0) {
      if (summary) summary.hidden = false;
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (summary) summary.hidden = true;
    const btn = document.getElementById("orderSubmit");
    btn.textContent = "Sending…";
    btn.disabled = true;
    // Simulate async submission
    setTimeout(() => {
      btn.textContent = "Place order →";
      btn.disabled = false;
      const success = document.getElementById("orderSuccess");
      if (success) {
        success.hidden = false;
        success.focus();
      }
      form.reset();
      basket.clear();
      updateBasketUI();
      renderOrderSummary();
    }, 1000);
  });
}

function renderOrderSummary() {
  const container = document.getElementById("summaryItems");
  const totalEl = document.getElementById("summaryTotal");
  const deliveryEl = document.getElementById("summaryDelivery");
  const grandTotalEl = document.getElementById("summaryGrandTotal");
  if (!container) return;

  const subtotal = basket.total;
  const delivery = subtotal === 0 ? 0 : subtotal >= 300 ? 0 : 49;
  const grandTotal = subtotal + delivery;

  if (basket.isEmpty) {
    container.innerHTML = `<p class="summary-empty">Your basket is empty.<br>
      <a href="products.html" class="form-link">Browse our produce →</a></p>`;
  } else {
    container.innerHTML = basket.items
      .map(
        (item) => `
      <div class="summary-item" role="listitem" aria-label="${esc(item.name)}, quantity ${item.qty}">
        <img class="summary-item__img" src="${esc(item.img)}" alt="" aria-hidden="true"/>
        <div class="summary-item__details">
          <p class="summary-item__name">${esc(item.name)}</p>
          <p class="summary-item__sub">Qty: ${item.qty} × kr ${item.price}</p>
        </div>
        <span class="summary-item__price">kr ${item.price * item.qty}</span>
      </div>`,
      )
      .join("");
  }

  if (totalEl) totalEl.textContent = `kr ${subtotal}`;
  if (deliveryEl)
    deliveryEl.textContent = delivery === 0 ? "Free" : `kr ${delivery}`;
  if (grandTotalEl) grandTotalEl.textContent = `kr ${grandTotal}`;
}

function validateSingleField(field) {
  const errEl = document.getElementById(`${field.id}-error`);
  field.removeAttribute("aria-invalid");
  if (errEl) errEl.textContent = "";
  const val = field.value.trim();
  let msg = "";
  if (field.required && !val) {
    msg = `${field.labels?.[0]?.textContent.replace("*", "").trim() || "This field"} is required.`;
  } else if (
    field.type === "email" &&
    val &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  ) {
    msg = "Please enter a valid email address.";
  } else if (field.id === "postcode" && val && !/^\d{4}$/.test(val)) {
    msg = "Enter a 4-digit Norwegian postcode.";
  }
  if (msg) {
    field.setAttribute("aria-invalid", "true");
    if (errEl) errEl.textContent = msg;
  }
  return !msg;
}

function validateOrderForm() {
  const errors = [];
  document
    .getElementById("orderForm")
    .querySelectorAll("[required]")
    .forEach((f) => {
      if (!validateSingleField(f)) errors.push(f.id);
    });
  return errors;
}

const CHAT_SYSTEM = `You are the helpful assistant for Fram, a sustainable Norwegian farm-to-door food delivery service.
Keep answers short (2-4 sentences). Be warm and helpful about:
- Products: oats, red onions, garlic, potatoes, carrots from local Norwegian farms
- Delivery: home delivery directly from partner farms, free over kr 300
- Sustainability: reusable containers, scan & reorder, circular service
- Partner farm: Braastad Gaard, Oppdalslinna 242, 2740 Roa, Norway
Reply in English unless the user writes in Norwegian.`;

let chatHistory = [];

async function sendChat(text) {
  const msgEl = document.getElementById("chatMessages");
  const sendBtn = document.getElementById("chatSend");
  const errEl = document.getElementById("chatError");
  const input = document.getElementById("chatInput");
  if (!msgEl) return;

  if (errEl) errEl.hidden = true;

  appendChatMsg("user", text);
  chatHistory.push({ role: "user", content: text });

  if (sendBtn) {
    sendBtn.classList.add("loading");
    sendBtn.disabled = true;
  }

  const typing = document.createElement("div");
  typing.className = "chat-msg chat-msg--bot";
  typing.setAttribute("aria-label", "Fram is typing");
  typing.innerHTML = `
    <span class="chat-msg__sender" aria-hidden="true">FRAM</span>
    <p class="chat-msg__bubble chat-msg__bubble--bot chat-msg__bubble--typing">•••</p>`;
  msgEl.appendChild(typing);
  msgEl.scrollTop = msgEl.scrollHeight;

  try {
    const messages = [{ role: "system", content: CHAT_SYSTEM }, ...chatHistory];

    const reply = await callOpenAI(messages, 300);

    typing.remove();
    appendChatMsg("bot", reply);
    chatHistory.push({ role: "assistant", content: reply });

    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-16);
  } catch (err) {
    typing.remove();
    if (errEl) {
      errEl.textContent = err.message?.includes("401")
        ? "Invalid API key. Add your OpenAI key to main.js."
        : "Failed to connect. Wait and try again later.";
      errEl.hidden = false;
    }
  }

  if (sendBtn) {
    sendBtn.classList.remove("loading");
    sendBtn.disabled = false;
  }
  input?.focus();
}

function appendChatMsg(role, text) {
  const msgEl = document.getElementById("chatMessages");
  if (!msgEl) return;
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg--${role}`;
  div.innerHTML =
    role === "bot"
      ? `<span class="chat-msg__sender" aria-hidden="true">FRAM</span>
       <p class="chat-msg__bubble chat-msg__bubble--bot">${esc(text)}</p>`
      : `<p class="chat-msg__bubble chat-msg__bubble--user">${esc(text)}</p>`;
  msgEl.appendChild(div);
  msgEl.scrollTop = msgEl.scrollHeight;
}

function initChatPage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  if (!input || !sendBtn) return;

  function send() {
    const t = input.value.trim();
    if (!t) return;
    input.value = "";
    sendChat(t);
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  updateBasketUI();
  initAddToBasket();
  initNewsletter();
  initHiwAccordion();
  initProductFilter();
  initAISearch();

  if (document.getElementById("basketDrawer")) {
    initBasketDrawer();
    initMap();
  }

  initOrderPage();

  if (document.getElementById("chatInput")) initChatPage();
});
