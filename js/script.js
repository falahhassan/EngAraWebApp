let dictionaryData = {};

async function loadDictionary() {
    try {
        const response = await fetch('../data/dictionary.json'); // path from js folder
        if (!response.ok) throw new Error('File not found');
        dictionaryData = await response.json();
        document.getElementById('stats').innerHTML = `✅ ${Object.keys(dictionaryData).length} entries loaded`;
        document.getElementById('results').innerHTML = '<div class="no-results">✨ Type a word to search</div>';
    } catch (err) {
        document.getElementById('stats').innerHTML = '❌ Failed to load dictionary.json';
        document.getElementById('results').innerHTML = `<div class="error">
            Start a local server: <code>python3 -m http.server 8000</code><br>
            Then open <strong>http://localhost:8000</strong><br>
            Ensure dictionary.json is in <strong>data/</strong> folder.
        </div>`;
    }
}

function search() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!query) return;
    const matches = Object.entries(dictionaryData).filter(([word]) => word.toLowerCase().includes(query));
    const statsDiv = document.getElementById('stats');
    const resultsDiv = document.getElementById('results');
    statsDiv.innerHTML = `🔍 ${matches.length} result(s) for "${escapeHtml(query)}" · total ${Object.keys(dictionaryData).length}`;
    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No matches found</div>';
        return;
    }
    resultsDiv.innerHTML = matches.map(([word, meaning]) => `
        <div class="entry">
            <strong>📘 ${escapeHtml(word)}</strong>
            <div class="meaning">${escapeHtml(meaning)}</div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

document.getElementById('searchBtn').addEventListener('click', search);
document.getElementById('searchInput').addEventListener('keypress', e => { if (e.key === 'Enter') search(); });
loadDictionary();