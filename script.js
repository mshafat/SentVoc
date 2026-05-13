// ভার্সন কোড নেম: SentVoc v4.6 - Language Sync & UI Restore
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let iosAudioUnlocked = false;

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    const inputArea = document.getElementById('note-input');
    if(inputArea) {
        // ডাবল ক্লিক বা সিলেকশনে হাইলাইট টুল দেখাবে
        inputArea.addEventListener('mouseup', handleSelection);
    }
    
    // আইফোন অডিও আনলক
    ['touchstart', 'click'].forEach(e => document.body.addEventListener(e, unlockIOSAudio, { once: true }));
};

// --- অডিও ইঞ্জিন ---
function unlockIOSAudio() {
    if (iosAudioUnlocked) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    iosAudioUnlocked = true;
}

function speakText(event) {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    const card = currentSessionCards[currentIndex];
    if (!card) return;
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;

    window.speechSynthesis.cancel();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak)}&tl=${langCode}&total=1&idx=0&textlen=${textToSpeak.length}&client=tw-ob`;
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.play().catch(() => {
        const ut = new SpeechSynthesisUtterance(textToSpeak);
        ut.lang = langCode;
        window.speechSynthesis.speak(ut);
    });
}

// --- সেটিংস ও ল্যাংগুয়েজ সিঙ্ক ---
function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    if(!lSel) return;
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
    
    // ভ্যালু চেঞ্জ হলে সেভ হবে
    lSel.onchange = () => localStorage.setItem('pref_learn', lSel.value);
    tSel.onchange = () => localStorage.setItem('pref_target', tSel.value);
}

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    m.classList.toggle('hidden');
    m.classList.toggle('flex');
}

// --- ডিকশনারি ও অনুবাদ লজিক (আপনার প্রধান চাহিদা) ---
async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    
    document.getElementById('dict-word').innerText = word;
    document.getElementById('dict-meaning').innerText = "Searching...";
    document.getElementById('sentence-meaning').innerText = "Translating...";

    // সেটিংস থেকে বর্তমান টার্গেট ল্যাংগুয়েজ নেওয়া হচ্ছে
    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value; 
    const card = currentSessionCards[currentIndex];

    try {
        // ১. শব্দের অর্থ অনুবাদ
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-meaning').innerText = wData[0][0][0];

        // ২. বাক্যের অর্থ অনুবাদ (টার্গেট ল্যাংগুয়েজে)[cite: 1]
        if(card && card.sentence) {
            const sRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(card.sentence)}`);
            const sData = await sRes.json();
            document.getElementById('sentence-meaning').innerText = sData[0][0][0];
        }
    } catch (e) {
        document.getElementById('dict-meaning').innerText = "Error loading translation.";
    }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

// --- সিলেকশন ও বোল্ড টুল ---
function handleSelection() {
    const sel = window.getSelection();
    const tool = document.getElementById('bold-tool');
    if (sel.toString().trim().length > 0) {
        tool.classList.remove('hidden');
    } else {
        tool.classList.add('hidden');
    }
}

function makeBold() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline decoration-2 underline-offset-4";
    span.innerText = sel.toString().trim();
    range.deleteContents();
    range.insertNode(span);
    document.getElementById('bold-tool').classList.add('hidden');
    window.getSelection().removeAllRanges();
}

// --- ডাটা হ্যান্ডলিং ---
function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Please highlight a word first!");
    
    const date = new Date().toLocaleDateString();
    if (!notes[date]) notes[date] = [];
    
    words.forEach(w => {
        notes[date].push({
            word: w.innerText.trim(),
            sentence: input.innerText.trim(),
            id: Date.now() + Math.random(),
            timestamp: Date.now()
        });
    });
    
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = "";
    alert("Saved successfully!");
}

function exportData() {
    const data = JSON.stringify({notes, learnedWords});
    const isoDate = new Date().toISOString().split('T')[0];
    const blob = new Blob([data], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SentVoc_Backup_${isoDate}.json`;
    a.click();
}

// --- থিম ও নেভিগেশন ---
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function applyTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    document.getElementById(s + '-view').classList.remove('hidden');
    if(s === 'learned') renderLearnedList();
}

// কার্ড সেশন লজিক (v4.5 এর মতই থাকবে)
function startRepeat(mode) {
    currentSessionCards = [];
    if (mode === 'mastered') {
        currentSessionCards = [...learnedWords];
    } else {
        const now = Date.now();
        Object.values(notes).flat().forEach(c => {
            if(learnedWords.some(l => l.id === c.id)) return;
            const age = now - c.timestamp;
            if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
            else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
            else if (mode === 'all') currentSessionCards.push(c);
        });
    }
    if (currentSessionCards.length === 0) return alert("No cards found!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    showSection('repeat');
    showCard();
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    
    if (isFlipped) {
        content.className = "text-xl font-bold text-slate-700 dark:text-slate-300 leading-relaxed text-center";
        const regex = new RegExp(`(${card.word})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, `<mark class="bg-yellow-200 dark:bg-yellow-500/30 px-1 rounded font-black italic cursor-pointer" onclick="lookup('$1')">$1</mark>`);
    } else {
        content.innerText = card.word;
        content.className = "text-5xl font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter text-center";
    }
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("Session complete!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function markAsLearned() {
    learnedWords.push(currentSessionCards[currentIndex]);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    nextCard();
}
