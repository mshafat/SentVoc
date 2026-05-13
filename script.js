// ভার্সন কোড নেম: SentVoc v3.7 - Web Share API & Target Final Fix
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare(); // অন্য অ্যাপ থেকে আসা ডেটা চেক করবে

    const inputArea = document.getElementById('note-input');
    if(inputArea) inputArea.addEventListener('dblclick', handleSmartHighlight);
};

// --- অন্য অ্যাপ থেকে শেয়ার করা টেক্সট ধরার লজিক ---
function handleIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text') || urlParams.get('title') || urlParams.get('url');
    
    if (sharedText) {
        const inputArea = document.getElementById('note-input');
        if (inputArea) {
            // পরিষ্কার করার জন্য ডিকোড করা
            inputArea.innerText = decodeURIComponent(sharedText).replace(/\+/g, ' ');
            // URL থেকে প্যারামিটার সরিয়ে ফেলা যাতে পেজ রিফ্রেশ করলে আবার না আসে
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// --- আপনার বন্ধুর দেওয়া এক্সপোর্ট কোড (উন্নত সংস্করণ) ---
async function exportData() {
    const data = JSON.stringify({notes, learnedWords}, null, 2);
    const fileName = `SentVoc_Backup_${new Date().toISOString().slice(0,10)}.json`;

    // আধুনিক ব্রাউজারে ফাইল শেয়ারিং সাপোর্ট চেক
    try {
        if (navigator.canShare && navigator.share) {
            const file = new File([data], fileName, { type: 'application/json' });
            
            // অ্যান্ড্রয়েড বা আইফোনে শেয়ার ডায়ালগ ওপেন করার চেষ্টা
            await navigator.share({
                files: [file],
                title: 'SentVoc Backup',
                text: 'SentVoc vocabulary backup file'
            });
            console.log('Shared successfully');
        } else {
            throw new Error('Web Share not supported');
        }
    } catch (err) {
        console.warn('Share API failed or not supported, downloading instead...', err);
        downloadFile(data, fileName);
    }
}

function downloadFile(content, name) {
    const blob = new Blob([content], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// --- সেটিংস ও কোর ফাংশনসমূহ ---
function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    if(!lSel) return;
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
}

function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    if(!content) return;

    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    // v3.3 এর স্পেসিং বজায় রাখা হয়েছে
    content.style.padding = "2px 5px";
    content.style.wordBreak = "normal"; 
    content.style.overflowWrap = "break-word";

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
        content.className = "font-semibold text-slate-700 dark:text-slate-300 text-center";
    } else {
        content.innerText = card.word;
        content.style.fontSize = getDynamicFontSize(card.word, 'word');
        content.className = "font-black text-slate-800 dark:text-white uppercase text-center tracking-tight pt-4";
    }
}

function getDynamicFontSize(text, type) {
    const wordCount = text.split(/\s+/).length;
    if (type === 'word') {
        const isLatin = /^[A-Za-z0-9\s!@#$%^&*(),.?":{}|<>]+$/.test(text);
        let size = isLatin ? 2.3 : 3.2; 
        if (text.length > 12) size *= 0.75;
        return size + "rem";
    } else {
        let size = 1.55; 
        let lineHeight = 1.45;
        if (wordCount > 55) { size = 1.05; lineHeight = 1.25; }
        else if (wordCount > 35) { size = 1.25; lineHeight = 1.35; }
        return { size: size + "rem", lh: lineHeight };
    }
}

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("Double tap to highlight a word!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("Saved!");
}

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    if(m) m.classList.toggle('hidden');
}

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

// ... বাকি ফাংশনগুলো (startRepeat, flipCard, nextCard, lookup, speakText) অপরিবর্তিত থাকবে ...
