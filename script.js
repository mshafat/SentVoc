// Language codes for settings
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

// Initialize Languages
window.onload = () => {
    const learnSelect = document.getElementById('learn-lang');
    const targetSelect = document.getElementById('target-lang');
    
    Object.entries(languages).forEach(([code, name]) => {
        learnSelect.add(new Option(name, code));
        targetSelect.add(new Option(name, code));
    });

    // Default selection
    learnSelect.value = "ur"; // Default learning Urdu
    targetSelect.value = "bn"; // Default meaning in Bengali
};

function showSection(section) {
    document.getElementById('input-view').classList.add('hidden');
    document.getElementById('repeat-view').classList.add('hidden');
    document.getElementById('learned-view').classList.add('hidden');
    document.getElementById('settings-view').classList.add('hidden');

    if(section === 'input') document.getElementById('input-view').classList.remove('hidden');
    if(section === 'repeat') document.getElementById('repeat-view').classList.remove('hidden');
    if(section === 'learned') {
        renderLearnedList();
        document.getElementById('learned-view').classList.remove('hidden');
    }
}

function toggleSettings() {
    const settings = document.getElementById('settings-view');
    settings.classList.toggle('hidden');
}

function saveNote() {
    const input = document.getElementById('note-input');
    const text = input.value.trim();
    if (!text) return;

    const date = new Date().toLocaleDateString();
    const boldWords = text.match(/\*\*(.*?)\*\*/g);

    if (!boldWords) return alert("Please **bold** the word you want to learn!");

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
    // Collect all words except already learned ones
    Object.values(notes).forEach(dayCards => {
        dayCards.forEach(card => {
            if(!learnedWords.some(lw => lw.word === card.word)) {
                currentSessionCards.push(card);
            }
        });
    });

    if (currentSessionCards.length === 0) return alert("No new cards to review!");
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
        const words = card.sentence.split(" ");
        content.innerHTML = words.map(w => `<span class="cursor-pointer text-indigo-500" onclick="lookup('${w.replace(/[.,]/g, "")}')">${w}</span>`).join(" ");
        content.classList.replace('text-3xl', 'text-xl');
    } else {
        content.innerText = card.word;
        content.classList.replace('text-xl', 'text-3xl');
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    showCard();
}

function nextCard() {
    if (currentIndex < currentSessionCards.length - 1) {
        currentIndex++;
        isFlipped = false;
        showCard();
    } else {
        alert("Session Finished!");
        showSection('input');
    }
}

function markAsLearned() {
    const currentCard = currentSessionCards[currentIndex];
    learnedWords.push(currentCard);
    localStorage.setItem('learned_words', JSON.stringify(learnedWords));
    
    // Remove from current session
    currentSessionCards.splice(currentIndex, 1);
    
    if (currentSessionCards.length === 0 || currentIndex >= currentSessionCards.length) {
        alert("Well done! All cards finished.");
        showSection('input');
    } else {
        isFlipped = false;
        showCard();
    }
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-slate-400 text-center py-10">No words mastered yet.</p>' : '';
    
    learnedWords.forEach(lw => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center";
        div.innerHTML = `<div><p class="font-bold text-indigo-600">${lw.word}</p><p class="text-xs text-slate-400">${lw.sentence}</p></div>`;
        list.appendChild(div);
    });
}

async function lookup(word) {
    event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    const wordEl = document.getElementById('dict-word');
    const meaningEl = document.getElementById('dict-meaning');
    
    const sourceLang = document.getElementById('learn-lang').value;
    const targetLang = document.getElementById('target-lang').value;

    wordEl.innerText = "Searching...";
    meaningEl.innerText = "";
    modal.classList.replace('hidden', 'flex');

    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURI(word)}`);
        const data = await res.json();
        
        if (data[0] && data[0][0]) {
            wordEl.innerText = word;
            meaningEl.innerText = data[0][0][0];
        } else {
            meaningEl.innerText = "Definition not found.";
        }
    } catch (e) {
        meaningEl.innerText = "Check connection.";
    }
}

function closeModal() {
    document.getElementById('dict-modal').classList.replace('flex', 'hidden');
}
