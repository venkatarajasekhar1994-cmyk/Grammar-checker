const nlp = window.nlp || window.compromise;
let DICTIONARY = {};
let VERBS = {};
let RULES = {};

if (!nlp) {
  console.error('Compromise not loaded: window.nlp is undefined');
}


const textInput = document.getElementById('textInput');
const checkButton = document.getElementById('checkButton');
const loadingMessage = document.getElementById('loadingMessage');
const resultsEl = document.getElementById('results');

window.onload = () => { loadAllData(); };

async function loadAllData() {
    try {
        const [dictData, verbsData, rulesData] = await Promise.all([
            fetch('dictionary.json').then(res => res.json()),
            fetch('verbs.json').then(res => res.json()),
            fetch('rules.json').then(res => res.json())
        ]);
        DICTIONARY = dictData; // { "a": {...} }
        VERBS = verbsData;     // { "walk": {...} }
        RULES = rulesData;     // { "5": {...} }

        loadingMessage.style.display = 'none';
        textInput.disabled = false;
        checkButton.disabled = false;
        textInput.placeholder = "Enter your sentence here... (e.g., He walk to scool)";
    } catch (err) {
        loadingMessage.textContent = "లోపం: ఫైల్స్ లోడ్ కాలేదు. ఫైల్స్ అన్నీ ఒకే ఫోల్డర్‌లో ఉన్నాయో లేదో చూడండి.";
        console.error("Data loading failed:", err);
    }
}

checkButton.addEventListener('click', () => {
    const sentence = textInput.value;
    resultsEl.innerHTML = ''; 
    if (sentence.trim() === "") {
        resultsEl.innerHTML = '<p>దయచేసి వాక్యం టైప్ చేయండి.</p>';
        return;
    }

    let words = nlp(sentence).terms().out('array');
    
    let spellingMistakes = checkSpelling(words);
    spellingMistakes.forEach(mistake => {
        showResultCard(`స్పెల్లింగ్ తప్పు: <span class="highlight-error">${mistake}</span>`, "ఈ పదం మీ డిక్షనరీలో లేదు.", "spell-error");
    });

    let grammarMistakes = checkGrammarRule5(sentence);
    grammarMistakes.forEach(mistake => {
        showResultCard(
            `గ్రామర్ తప్పు: <span class="highlight-error">${mistake.wrongVerb}</span>`,
            `<strong>వివరణ (రూల్ #${mistake.rule.ruleNo}):</strong> ${mistake.rule.telugu}`,
            "error",
            `<strong>సరైన పదం:</strong> <span class="highlight-correction">${mistake.correctVerb}</span>`
        );
    });

    if (spellingMistakes.length === 0 && grammarMistakes.length === 0) {
        showResultCard("అద్భుతం!", "ఈ వాక్యంలో తప్పులు కనబడలేదు.", "info");
    }
});

function checkSpelling(words) {
    const mistakes = [];
    const punctuation = /[.,!?;:]$/; 
    words.forEach(word => {
        let cleanWord = word.toLowerCase().replace(punctuation, '');
        if (cleanWord.length <= 1) return;
        
        // ఇది వేగవంతమైన "ఇండెక్స్" లుక్అప్
        if (!DICTIONARY[cleanWord] && !VERBS[cleanWord]) {
            mistakes.push(word);
        }
    });
    return mistakes;
}

function checkGrammarRule5(sentence) {
    const mistakes = [];
    let doc = nlp(sentence);
    let subjects = doc.subjects();
    let verbs = doc.verbs();
    if (!subjects.found || !verbs.found) return mistakes;

    let subjectText = subjects.out('array')[0].toLowerCase();
    let verbText = verbs.out('array')[0];
    let baseVerb = verbs.toInfinitive().out('array')[0]; 

    const singularSubjects = ['he', 'she', 'it'];

    // ఇది వేగవంతమైన "ఇండెక్స్" లుక్అప్
    if (singularSubjects.includes(subjectText) && VERBS[baseVerb]) {
        let correctVerb = VERBS[baseVerb]["3rd Person Singular (he/she/it)  (V5)"];
        
        if (verbText.toLowerCase() !== correctVerb.toLowerCase()) {
            const teluguRule = (RULES && (RULES[String(5)]?.TeluguRule || Object.values(RULES).find(r => String(r?.['Rule No'])==='5')?.TeluguRule)) || "ఏకవచన కర్తతో ఏకవచన క్రియ వాడాలి.";
            mistakes.push({
                wrongVerb: verbText,
                correctVerb: correctVerb,
                rule: { ruleNo: 5, telugu: teluguRule }
            });
        }
    }
    return mistakes;
}

function showResultCard(title, explanation, type = "info", correction = "") {
    let card = document.createElement('div');
    card.className = `result-card ${type}`;
    let html = `<h4>${title}</h4><p>${explanation}</p>`;
    if (correction) { html += `<p>${correction}</p>`; }
    card.innerHTML = html;
    resultsEl.appendChild(card);
}

