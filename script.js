// ভার্সন কোড নেম: SentVoc v4.2 - Original Bold Look & v2.4 Mastered Logic
const languages = { "en": "English", "bn": "Bengali", "ur": "Urdu", "ar": "Arabic", "es": "Spanish", "fr": "French", "de": "German", "hi": "Hindi", "tr": "Turkish", "ru": "Russian", "fa": "Persian" };

let notes = JSON.parse(localStorage.getItem('sentvoc_notes')) || {};
let learnedWords = JSON.parse(localStorage.getItem('sentvoc_learned')) || [];
let currentSessionCards = [];
let currentIndex = 0;
let isFlipped = false;
let isReviewingMastered = false;

window.onload = () => {
    applyTheme();
    setupLanguages();
    handleIncomingShare();

    const inputArea = document.getElementById('note-input');
    if(inputArea) {
        inputArea.addEventListener('dblclick', handleSmartHighlight);
    }
};

// --- শেয়ার লজিক (v4.1 থেকে উন্নত করা - ডাবল টেক্সট ও কোটেশন ফিক্স) ---
function handleIncomingShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    
    if (sharedText || sharedTitle) {
        let rawContent = (sharedText || "") + " " + (sharedTitle || "");
        
        let cleanText = decodeURIComponent(rawContent)
            .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') 
            .replace(/["'“”]/g, '') 
            .replace(/\+/g, ' ')
            .trim();

        // ডুপ্লিকেট টেক্সট রিমুভার
        const half = Math.floor(cleanText.length / 2);
        const part1 = cleanText.substring(0, half).trim();
        const part2 = cleanText.substring(half).trim();
        if(part1 === part2) cleanText = part1;

        setTimeout(() => {
            const inputArea = document.getElementById('note-input');
            if (inputArea) {
                inputArea.innerText = cleanText;
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 500);
    }
}

// --- কার্ড ডিসপ্লে (v4.0 এর বোল্ড লুক ফিরিয়ে আনা হয়েছে) ---
function showCard() {
    const card = currentSessionCards[currentIndex];
    const content = document.getElementById('card-content');
    if(!content) return;

    document.getElementById('card-progress').innerText = `${currentIndex + 1} / ${currentSessionCards.length}`;
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    
    if (isFlipped) {
        // v4.0 স্টাইল বোল্ড সেন্টেন্স
        content.className = "text-2xl font-bold text-slate-700 dark:text-slate-300 leading-snug text-center";
        const regex = new RegExp(`(${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        content.innerHTML = card.sentence.replace(regex, "___MARK___$1___END___").split(/\s+/).map(p => {
            const clean = p.replace("___MARK___", "").replace("___END___", "").replace(/[.,!?।]/g, "");
            if (p.includes("___MARK___")) return `<mark class="bg-yellow-200 dark:bg-yellow-500/50 px-1 rounded font-black italic cursor-pointer" onclick="lookup('${clean}')">${p.replace("___MARK___", "").replace("___END___", "")}</mark>`;
            return `<span class="cursor-pointer text-indigo-500 hover:underline" onclick="lookup('${clean}')">${p}</span>`;
        }).join(" ");
    } else {
        // v4.0 স্টাইল বিগ বোল্ড ওয়ার্ড
        content.innerText = card.word;
        content.className = "text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center";
    }
}

// --- মাস্টারড বাটন ও লার্নড লিস্ট (v2.4 এর লজিক) ---
function markAsLearned() {
    if(!confirm("আয়ত্ত করেছেন? এটি লার্নড লিস্টে চলে যাবে।")) return;
    
    const card = currentSessionCards[currentIndex];
    learnedWords.push(card);
    localStorage.setItem('sentvoc_learned', JSON.stringify(learnedWords));
    
    // বর্তমান সেশন থেকে রিমুভ করা
    currentSessionCards.splice(currentIndex, 1);
    
    if (currentSessionCards.length === 0) {
        alert("সব কার্ড শেষ!");
        showSection('input');
    } else {
        if(currentIndex >= currentSessionCards.length) currentIndex--;
        isFlipped = false;
        showCard();
    }
}

function renderLearnedList() {
    const list = document.getElementById('learned-list');
    list.innerHTML = learnedWords.length === 0 ? '<p class="text-center py-10 text-slate-400 opacity-50">Mastered list is empty.</p>' : '';
    
    // v2.4 স্টাইল রিভার্স লিস্ট (নতুনগুলো আগে)
    [...learnedWords].reverse().forEach((lw, idx) => {
        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3 border-l-4 border-green-500";
        div.innerHTML = `
            <div class="flex justify-between">
                <div>
                    <p class="font-black text-indigo-600 dark:text-indigo-400 uppercase text-lg">${lw.word}</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${lw.sentence}</p>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- সেশন শুরু (v2.4 লজিক) ---
function startRepeat(mode) {
    currentSessionCards = [];
    isReviewingMastered = (mode === 'mastered');
    
    if (isReviewingMastered) {
        currentSessionCards = [...learnedWords];
    } else {
        const now = Date.now();
        Object.values(notes).forEach(day => {
            day.forEach(c => {
                // লার্নড লিস্টে থাকলে রিপিটে আসবে না
                if(learnedWords.some(l => l.id === c.id)) return;
                const age = now - (c.timestamp || 0);
                if (mode === 'today' && age <= 86400000) currentSessionCards.push(c);
                else if (mode === 'week' && age <= 604800000) currentSessionCards.push(c);
                else if (mode === 'all') currentSessionCards.push(c);
            });
        });
    }
    
    if (currentSessionCards.length === 0) return alert("কোন কার্ড নেই!");
    
    currentSessionCards.sort(() => Math.random() - 0.5);
    currentIndex = 0; isFlipped = false;
    
    // রিভিউ মোডে মাস্টারড বাটন হাইড করা
    const mBtn = document.getElementById('mastered-btn');
    if(mBtn) mBtn.style.display = isReviewingMastered ? 'none' : 'block';
    
    showCard(); 
    showSection('repeat');
}

// --- এক্সপোর্ট (শেয়ার অপশন সহ) ---
async function exportData() {
    const data = JSON.stringify({notes, learnedWords}, null, 2);
    const fileName = `SentVoc_Backup.json`;
    try {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.share) {
            await navigator.share({ files: [file], title: 'SentVoc Backup' });
        } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            a.click();
        }
    } catch (err) { alert("Export failed"); }
}

// --- ইমপোর্ট (v2.4 ফিক্সড) ---
function importData(e) { 
    const file = e.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = (event) => { 
        try {
            const d = JSON.parse(event.target.result); 
            localStorage.setItem('sentvoc_notes', JSON.stringify(d.notes || {}));
            localStorage.setItem('sentvoc_learned', JSON.stringify(d.learnedWords || []));
            alert("Data Imported!"); 
            location.reload(); 
        } catch (err) { alert("Invalid File"); }
    }; 
    reader.readAsText(file); 
}

// --- ইউটিলিটি ফাংশনস ---
function showSection(s) {
    document.querySelectorAll('#input-view, #repeat-view, #learned-view').forEach(e => e.classList.add('hidden'));
    if(s === 'learned') renderLearnedList();
    document.getElementById(s+'-view').classList.remove('hidden');
}

function flipCard() { isFlipped = !isFlipped; showCard(); }
function nextCard() { if (currentIndex < currentSessionCards.length - 1) { currentIndex++; isFlipped = false; showCard(); } else { alert("সেশন শেষ!"); showSection('input'); } }
function prevCard() { if (currentIndex > 0) { currentIndex--; isFlipped = false; showCard(); } }

function saveNote() {
    const input = document.getElementById('note-input');
    const words = input.querySelectorAll('.vocab-word');
    if (words.length === 0) return alert("শব্দটি হাইলাইট করুন!");
    const date = new Date().toLocaleDateString();
    words.forEach(w => {
        if (!notes[date]) notes[date] = [];
        notes[date].push({ word: w.innerText.trim(), sentence: input.innerText.trim(), id: Date.now() + Math.random(), timestamp: Date.now() });
    });
    localStorage.setItem('sentvoc_notes', JSON.stringify(notes));
    input.innerHTML = ""; alert("সেভ সফল হয়েছে!");
}

function setupLanguages() {
    const lSel = document.getElementById('learn-lang'), tSel = document.getElementById('target-lang');
    Object.entries(languages).forEach(([c, n]) => { 
        lSel.add(new Option(n, c)); 
        tSel.add(new Option(n, c)); 
    });
    lSel.value = localStorage.getItem('pref_learn') || "ur";
    tSel.value = localStorage.getItem('pref_target') || "bn";
}

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

function handleSmartHighlight() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.toString().trim() === "") return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.className = "vocab-word text-indigo-600 dark:text-indigo-400 font-black underline underline-offset-4";
    span.innerText = sel.toString().trim();
    range.deleteContents();
    range.insertNode(span);
    window.getSelection().removeAllRanges();
}

async function lookup(word) {
    const modal = document.getElementById('dict-modal');
    modal.classList.replace('hidden', 'flex');
    const sl = document.getElementById('learn-lang').value;
    const tl = document.getElementById('target-lang').value;
    try {
        const wRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURI(word)}`);
        const wData = await wRes.json();
        document.getElementById('dict-word').innerText = word;
        document.getElementById('dict-meaning').innerText = wData[0][0][0];
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('dict-modal').classList.replace('flex', 'hidden'); }
