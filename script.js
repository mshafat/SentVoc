const languages = {
    "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", 
    "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian",
    "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "fa": "Persian"
};

let notes = JSON.parse(localStorage.getItem('vocab_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('learned_words')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    const learnSelect = document.getElementById('learn-lang');
    const targetSelect = document.getElementById('target-lang');
    Object.entries(languages).forEach(([code, name]) => {
        learnSelect.add(new Option(name, code));
        targetSelect.add(new Option(name, code));
    });
    learnSelect.value = localStorage.getItem('pref_learn') || "ur";
    targetSelect.value = localStorage.getItem('pref_target') || "bn";
};

function toggleSettings() {
    const settings = document.getElementById('settings-view');
    settings.classList.toggle('hidden');
    // Save preferences
    localStorage.setItem('pref_learn', document.getElementById('learn-lang').value);
    localStorage.setItem('pref_target', document.getElementById('target-lang').value);
}

function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return;

    // Improved Regex to catch start and end bold words
    const boldWords = text.match(/\*\*(.*?)\*\*/g);

    if (!boldWords) return alert("Please **bold** the word you want to learn!");

    const date = new Date().toLocaleDateString();
    const newEntries = boldWords.map(bw => ({
        word: bw.replace(/\*\*/g, ""),
        sentence: text.replace(/\*\*/g, ""),
        date: date,
        id: Date.now() + Math.random()
    }));

    if (!notes[date]) notes[date] = [];
    notes[date].push(...newEntries);
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    input.value = "";
    alert("Saved to VocabLog!");
}

function startRepeat(range) {
    currentSessionCards = [];
    Object.values(notes).forEach(dayCards => {
        dayCards.forEach(card => {
            if(!learnedWords.some(lw => lw.id === card.id)) {
                currentSessionCards.push(card);
            }
        });
    });

    if (currentSessionCards.length === 0) return alert("No cards found!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    
    currentIndex = 0;
    isFlipped = false;
    showCard();
    showSection('repeat');
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        const words = card.sentence.split(/\s+/);
        content.innerHTML = words.map(w => `<span class="cursor-pointer text-indigo-500 px-0.5" onclick="lookup('${w.replace(/[.,!?]/g, "")}')">${w}</span>`).join(" ");
        content.className = "text-xl font-medium text-slate-700 leading-relaxed";
    } else {
        content.innerText = card.word;
        content.className = "text-4xl font-black text-slate-800 tracking-tight";
    }
}

function deleteCurrentCard() {
    if (!confirm("Are you sure you want to delete this card?")) return;

    const cardToDelete = currentSessionCards[currentIndex];
    
    // Remove from 'notes' storage
    for (let date in notes) {
        notes[date] = notes[date].filter(card => card.id !== cardToDelete.id);
        if (notes[date].length === 0) delete notes[date];
    }
    
    localStorage.setItem('vocab_notes', JSON.stringify(notes));
    currentSessionCards.splice(currentIndex, 1);

    if (currentSessionCards.length === 0) {
        showSection('input');
    } else {
        if (currentIndex >= currentSessionCards.length) currentIndex = 0;
        isFlipped = false;
        showCard();
    }
}

function markAsLearned() {
    const currentCard = currentSessionCards[currentIndex];
    learnedWords.push(currentCard);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    
    currentSessionCards.splice(currentIndex, 1);
    
    if (currentSessionCards.length === 0) {
        alert("Session Finished!");
        showSection('input');
    } else {
        if (currentIndex >= currentSessionCards.length) currentIndex = 0;
        isFlipped = false;
        showCard();
    }
}

// Backup & Restore Functions
function exportData() {
    const data = { notes, learnedWords };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VocabLog_Backup_${new Date().toLocaleDateString()}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.notes && data.learnedWords) {
                notes = data.notes;
                learnedWords = data.learnedWords;
                localStorage.setItem('vocab_notes', JSON.stringify(notes));
                localStorage.setItem('learned_words', JSON.stringify(learnedWords));
                alert("Data Restored Successfully!");
                location.reload();
            }
        } catch (err) {
            alert("Invalid Backup File!");
        }
    };
    reader.readAsText(file);
}

// Reuse previous functions: showSection, flipCard, nextCard, lookup, closeModal...
// (Keep the remaining functions from the previous script.js)
function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("End of cards."); showSection('input'); } }
function showSection(s) { document.getElementById('input-view').classList.add('hidden'); document.getElementById('repeat-view').classList.add('hidden'); document.getElementById('learned-view').classList.add('hidden'); if(s==='learned') renderLearnedList(); document.getElementById(s+'-view').classList.remove('hidden'); }
function renderLearnedList() { const list = document.getElementById('learned-list'); list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400">Nothing mastered yet.</p>' : ''; learnedWords.forEach(lw => { const div = document.createElement('div'); div.className = "bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"; div.innerHTML = `<p class="font-bold text-indigo-600">${lw.word}</p><p class="text-xs text-slate-400 mt-1">${lw.sentence}</p>`; list.appendChild(div); }); }
async function lookup(word) { event.stopPropagation(); const modal = document.getElementById('dict-modal'); const wordEl = document.getElementById('dict-word'); const meaningEl = document.getElementById('dict-meaning'); modal.classList.replace('hidden', 'flex'); wordEl.innerText = "Searching..."; try { const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${document.getElementById('learn-lang').value}&tl=${document.getElementById('target-lang').value}&dt=t&q=${encodeURI(word)}`); const data = await res.json(); wordEl.innerText = word; meaningEl.innerText = data[0][0][0]; } catch (e) { meaningEl.innerText = "Error loading meaning."; } }
function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }
