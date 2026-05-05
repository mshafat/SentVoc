const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

// Theme Initialization
function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-icon').innerText = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-icon').innerText = '🌙';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    applyTheme();
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { lSel.add(new Option(n, c)); tSel.add(new Option(n, c)); });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
};

// Text Selection & Highlighting
function handleSelection() {
    const selection = window.getSelection();
    const boldTool = document.getElementById('bold-tool');
    if (selection.toString().trim().length > 0) {
        boldTool.classList.remove('hidden');
    } else {
        boldTool.classList.add('hidden');
    }
}

function makeBold() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline decoration-2 underline-offset-4";
    range.surroundContents(span);
    window.getSelection().removeAllRanges();
    document.getElementById('bold-tool').classList.add('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = input.innerHTML;
    
    const words = tempDiv.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Please select a word to highlight!");

    const date = new Date().toLocaleDateString();
    const sentenceRaw = tempDiv.innerText.trim();

    words.forEach(w => {
        const targetWord = w.innerText.trim();
        if (!notes[date]) notes[date] = [];
        notes[date].push({
            word: targetWord,
            sentence: sentenceRaw,
            id: Date.now() + Math.random()
        });
    });

    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.innerHTML = "";
    alert("Saved successfully!");
}

// Flashcard Logic
function startRepeat(range) {
    currentSessionCards = [];
    Object.values(notes).forEach(dayCards => {
        dayCards.forEach(card => {
            if(!learnedWords.some(lw => lw.id === card.id)) currentSessionCards.push(card);
        });
    });
    if (currentSessionCards.length === 0) return alert("No cards available!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false; showCard(); showSection('repeat');
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;

    if (isFlipped) {
        // Correctly highlighting the word inside the sentence
        let sentence = card.sentence;
        const safeWord = card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeWord})`, 'gi');
        
        // Wrap target word in a highlight tag
        const highlightedSentence = sentence.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-500/50 dark:text-white px-1 rounded font-bold italic">$1</mark>`);
        
        const words = highlightedSentence.split(/\s+/);
        content.innerHTML = words.map(w => {
            if(w.includes('<mark')) return w;
            const cleanWord = w.replace(/[.,!?।]/g, "");
            return `<span class="cursor-pointer text-indigo-500 dark:text-indigo-400 hover:underline" onclick="lookup('${cleanWord}')">${w}</span>`;
        }).join(" ");
        
        content.className = "text-2xl font-semibold text-slate-700 dark:text-slate-300 leading-snug";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 dark:text-white tracking-tight uppercase";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }

function nextCard() {
    if (currentIndex < currentSessionCards.length - 1) {
        currentIndex++; isFlipped = false; showCard();
    } else {
        alert("Session Complete!"); showSection('input');
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--; isFlipped = false; showCard();
    }
}

function markAsLearned() {
    if(!confirm("Mark as mastered?")) return;
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex--; isFlipped = false; showCard(); }
}

function deleteCurrentCard() {
    if (!confirm("Delete permanently?")) return;
    const cardId = currentSessionCards[currentIndex].id;
    for (let d in notes) {
        notes[d] = notes[d].filter(c => c.id !== cardId);
        if (notes[d].length === 0) delete notes[d];
    }
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    currentSessionCards.splice(currentIndex, 1);
    if (currentSessionCards.length === 0) showSection('input');
    else { if(currentIndex >= currentSessionCards.length) currentIndex = 0; isFlipped = false; showCard(); }
}

// Navigation & Dictionary
function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view, #settings-view').forEach(e => e.classList.add('hidden'));
    if(s==='learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function toggleSettings() {
    document.getElementById('settings-view').classList.toggle('hidden');
    localStorage.setItem('pref_learn', document.getElementById('learn-lang').value);
    localStorage.setItem('pref_target', document.getElementById('target-lang').value);
}

async function lookup(word) {
    event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    document.getElementById('dict-word').innerText = "Searching...";
    modal.classList.replace('hidden', 'flex');
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${document.getElementById('learn-lang').value}&tl=${document.getElementById('target-lang').value}&dt=t&q=${encodeURI(word)}`);
        const data = await res.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = data[0][0][0];
    } catch (e) { document.getElementById('dict-meaning').innerText = "Error loading translation."; }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">No words mastered yet.</p>' : '';
    learnedWords.forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm";
        div.innerHTML = `<p class="font-bold text-indigo-600 dark:text-indigo-400">${lw.word}</p><p class="text-xs text-slate-400 mt-1">${lw.sentence}</p>`;
        list.appendChild(div);
    });
}

// Backup Functions
function exportData() {
    const data = { notes, learnedWords };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `VocabLog_Backup.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        if (data.notes) {
            localStorage.setItem('vocab_notes', JSON.stringify(data.notes));
            localStorage.setItem('learned_words', JSON.stringify(data.learnedWords || []));
            location.reload();
        }
    };
    reader.readAsText(file);
}
