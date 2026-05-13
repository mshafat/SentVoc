// ভার্সন কোড নেম: SentVoc v3.0 - Ultimate Stability (Final)
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

// ১. পেজ লোড এবং সেটিংস ইনিশিয়ালাইজেশন
window.onload = () => {
    applyTheme(); // থিম লোড
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
    
    // স্মার্ট হাইলাইট লিসেনার
    const inputArea = document.getElementById('note-input');
    if(inputArea) inputArea.addEventListener('dblclick', handleSmartHighlight);
};

// ২. থিম এবং সেটিংস ফাংশন (যা v2.9 এ মিসিং ছিল)
function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    const icon = document.getElementById('theme-icon');
    if(icon) icon.innerText = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if(icon) icon.innerText = isDark ? '☀️' : '🌙';
}

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    if(!m) return;
    if(m.classList.contains('hidden')) {
        m.classList.remove('hidden');
        m.classList.add('flex');
    } else {
        m.classList.remove('flex');
        m.classList.add('hidden');
    }
}

// ৩. ডাইনামিক ফন্ট স্কেলিং লজিক (v2.9 এর ফিচার)
function getDynamicFontSize(text, type) {
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    if (type === 'word') {
        const isLatin = /^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/.test(text);
        let size = isLatin ? 2.5 : 3.5;
        if (charCount > 15) size *= 0.6;
        else if (charCount > 10) size *= 0.8;
        return size + "rem";
    } else {
        let size = 1.5;
        let lineHeight = 1.4;
        if (wordCount > 50) { size = 0.9; lineHeight = 1.1; }
        else if (wordCount > 35) { size = 1.1; lineHeight = 1.2; }
        else if (wordCount > 20) { size = 1.3; lineHeight = 1.3; }
        return { size: size + "rem", lh: lineHeight };
    }
}

// ৪. কার্ড ডিসপ্লে ফাংশন
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    
    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    content.style.wordBreak = "break-word";
    content.style.overflowWrap = "anywhere";

    if (isFlipped) {
        const style = getDynamicFontSize(card.sentence, 'sentence');
        content.style.fontSize = style.size;
        content.style.lineHeight = style.lh;

        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-bold italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
        content.className = "font-semibold text-slate-700 dark:text-slate-300 text-center px-4 overflow-y-auto max-h-[300px]";
    } else {
        content.innerText = card.word;
        content.className = "font-black text-slate-800 dark:text-white uppercase text-center tracking-tight px-2";
        content.style.fontSize = getDynamicFontSize(card.word, 'word');
        content.style.lineHeight = "normal";
    }
}

// ৫. স্মার্ট হাইলাইট (v2.6 থেকে অব্যাহত)
function handleSmartHighlight(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim() === "") return;
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentNode;

    if (parent.classList.contains('vocab-word')) {
        const textNode = document.createTextNode(parent.innerText);
        parent.parentNode.replaceChild(textNode, parent);
    } else {
        const span = document.createElement('span');
        span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
        span.innerText = selectedText;
        range.deleteContents();
        range.insertNode(span);
    }
    window.getSelection().removeAllRanges();
}

// ৬. অডিও ইঞ্জিন (iOS Native Fix)
function speakText(event) {
    if (event) event.stopPropagation();
    const card = currentSessionCards[currentIndex];
    const textToSpeak = isFlipped ? card.sentence : card.word;
    const langCode = document.getElementById('learn-lang').value;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    setTimeout(() => { window.speechSynthesis.speak(utterance); }, 50);
}

// ৭. কোর ফাংশনসমূহ (সেভ, নেক্সট, ডিলিট)
function saveNote() {
    const input = document.getElementById('note-input');
    const temp = document.createElement('div');
    temp.innerHTML = input.innerHTML;
    const words = temp.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Double tap to highlight a word!");
    
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: temp.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

function startRepeat(mode) {
    currentSessionCards = [];
    const now = Date.now();
    Object.values(notes).forEach(day => {
        day.forEach(c => {
            if(learnedWords.some(l => l.id === c.id)) return;
            const age = now - (c.timestamp || 0);
            if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
            else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
            else if (mode === 'all') currentSessionCards.push(c);
        });
    });
    if (currentSessionCards.length === 0) return alert("No cards!");
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    showCard(); showSection('repeat');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    document.getElementById(s+'-view').classList.remove('hidden');
}

async function lookup(word) {
    if (window.event) window.event.stopPropagation();
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value, tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }

function exportData() { 
    const blob = new Blob([JSON.stringify({notes, learnedWords})], {type: "application/json"}); 
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); 
    a.download = `SentVoc_v3.0_Backup.json`; a.click(); 
}

function importData(e) { 
    const f = e.target.files[0]; if(!f)return; 
    const r = new FileReader(); r.onload = (ev) => { 
        const d = JSON.parse(ev.target.result); 
        localStorage.setItem('sentvoc_notes', JSON.stringify(d.notes)); 
        localStorage.setItem('sentvoc_learned', JSON.stringify(d.learnedWords || [])); 
        location.reload(); 
    }; r.readAsText(f); 
}
