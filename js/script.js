let dictionaryData = {};
let _entries = null; // cached entries for performance

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD") // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks (café → cafe)
    .trim();
}

function getMeaning(val) {
  // handle string, array, or { meaning: "..." } shaped JSON values
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(" · ");
  if (val?.meaning) return String(val.meaning);
  return String(val);
}

function getEntries() {
  if (!_entries) _entries = Object.entries(dictionaryData);
  return _entries;
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escapedText.replace(
    new RegExp(`(${escapedQuery})`, "gi"),
    "<mark>$1</mark>",
  );
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Dictionary loader ──────────────────────────────────────────────────────

async function loadDictionary() {
  const statsDiv = document.getElementById("stats");
  const resultsDiv = document.getElementById("results");

  try {
    console.log("1. Starting load...");
    // Try absolute path from root (works on Netlify)
    const response = await fetch("/data/dictionary.json");
    console.log("2. Response status:", response.status);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Get as text first to check size
    const jsonText = await response.text();
    console.log("3. File size:", jsonText.length, "bytes");

    if (jsonText.length < 100)
      throw new Error("File too small - maybe wrong file?");

    dictionaryData = JSON.parse(jsonText);
    const entryCount = Object.keys(dictionaryData).length;
    console.log("4. Entries loaded:", entryCount);

    if (entryCount === 0) throw new Error("Parsed JSON has 0 entries");

    _entries = null;
    statsDiv.innerHTML = `✅ ${entryCount} entries loaded`;
    resultsDiv.innerHTML =
      '<div class="no-results">✨ Type a word to search</div>';
  } catch (err) {
    console.error("LOAD ERROR:", err);
    statsDiv.innerHTML = "❌ Dictionary load failed";
    resultsDiv.innerHTML = `<div class="error">
      <strong>Error:</strong> ${err.message}<br><br>
      <strong>Mobile fix:</strong><br>
      1. Refresh the page<br>
      2. Clear browser cache<br>
      3. Check your network<br><br>
      <small>See console (green button) for details</small>
    </div>`;
  }
}

// ── Search ─────────────────────────────────────────────────────────────────

function _search() {
  const raw = document.getElementById("searchInput").value;
  const query = normalize(raw);

  const statsDiv = document.getElementById("stats");
  const resultsDiv = document.getElementById("results");
  const total = Object.keys(dictionaryData).length;

  if (!query) {
    resultsDiv.innerHTML =
      '<div class="no-results">🔎 Type a word to search</div>';
    statsDiv.innerHTML = `📖 ${total} entries ready`;
    return;
  }

  // Rank results: exact → prefix → word contains → found in meaning
  const exact = [];
  const prefix = [];
  const inWord = [];
  const inMeaning = [];

  for (const [word, val] of getEntries()) {
    const nWord = normalize(word);
    const meaning = getMeaning(val);
    const nMeaning = normalize(meaning);

    if (nWord === query) exact.push([word, meaning, "exact"]);
    else if (nWord.startsWith(query)) prefix.push([word, meaning, "prefix"]);
    else if (nWord.includes(query)) inWord.push([word, meaning, "word"]);
    else if (nMeaning.includes(query))
      inMeaning.push([word, meaning, "meaning"]);
  }

  const matches = [...exact, ...prefix, ...inWord, ...inMeaning];

  statsDiv.innerHTML = matches.length
    ? `🔍 ${matches.length} result(s) for "${escapeHtml(raw)}" · ${total} entries`
    : `😕 No results for "${escapeHtml(raw)}" · ${total} entries`;

  if (!matches.length) {
    resultsDiv.innerHTML = `<div class="no-results">No matches for "${escapeHtml(raw)}". Try a shorter or different word.</div>`;
    return;
  }

  resultsDiv.innerHTML = matches
    .map(
      ([word, meaning, type]) => `
    <div class="entry" data-match-type="${type}">
      <strong>📘 ${highlight(word, raw)}</strong>
      <div class="meaning">${type === "meaning" ? highlight(meaning, raw) : escapeHtml(meaning)}</div>
    </div>
  `,
    )
    .join("");
}

const search = debounce(_search, 250);

// ── Event listeners ────────────────────────────────────────────────────────

document.getElementById("searchBtn").addEventListener("click", search);
//document.getElementById("searchInput").addEventListener("input", search);
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") search();
});

loadDictionary();
