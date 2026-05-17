// script.js - German Studio - English version
let palabras = [];
let palabrasFiltradas = [];
let currentIndex = 0;
let studiedWords = new Set();
let favoriteWords = new Set();
let shuffled = false;
let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let datosCargados = false;
let progressChart = null;

// Game variables
let hangmanWord = '', hangmanGuessed = [], hangmanWrong = [], hangmanMaxWrong = 6, hangmanTraduccion = '', hangmanTema = '';
let wordsearchGrid = [], wordsearchWords = [], wordsearchFound = [], seleccionInicio = null;

// Theme colors
const temaColors = {
    'Accidents': '#c0392b', 'Adjectives': '#f1c40f', 'Animals': '#e67e22', 'Clothing': '#e94560',
    'Colors': '#f5a623', 'Family': '#4a90e2', 'Food & Drinks': '#f39c12', 'Travel': '#1abc9c',
    'Verbs': '#9b59b6', 'Body': '#e74c3c', 'Emergency': '#c0392b', 'Hobbies': '#2ecc71',
    'Nature': '#27ae60', 'Professions': '#8e44ad', 'Shopping': '#d35400', 'Weather': '#16a085'
};

function speak(text) { if (!text) return; const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'de-DE'; speechSynthesis.cancel(); speechSynthesis.speak(utterance); }

function updateStreak() {
    const today = new Date().toDateString(), last = localStorage.getItem('lastSession');
    let streak = parseInt(localStorage.getItem('streakDays')) || 0;
    if (last !== today) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (last === yesterday.toDateString()) streak++;
        else streak = 1;
        localStorage.setItem('lastSession', today);
        localStorage.setItem('streakDays', streak);
    }
    document.getElementById('streakDays').textContent = streak;
}

function extractArticle(wordComplete, articleRaw) {
    if (wordComplete.startsWith('der ')) return 'der';
    if (wordComplete.startsWith('die ')) return 'die';
    if (wordComplete.startsWith('das ')) return 'das';
    if (articleRaw) {
        if (articleRaw.includes('maskulin')) return 'der';
        if (articleRaw.includes('feminin')) return 'die';
        if (articleRaw.includes('neutrum')) return 'das';
    }
    return null;
}

function cleanWord(wordComplete) {
    if (wordComplete.startsWith('der ')) return wordComplete.substring(4);
    if (wordComplete.startsWith('die ')) return wordComplete.substring(4);
    if (wordComplete.startsWith('das ')) return wordComplete.substring(4);
    return wordComplete;
}

// ========== MODAL DE BIENVENIDA - Aparece en cada recarga ==========
function initWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    const closeBtn = document.getElementById('closeWelcomeBtn');
    
    // Siempre mostrar el modal al cargar/recargar la página
    if (modal) {
        modal.style.display = 'flex';
    }
    
    // Cerrar con el botón - CON ANIMACIÓN
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.animation = '';
            }, 200);
        };
    }
    
    // Cerrar haciendo clic fuera del modal
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.style.animation = '';
                }, 200);
            }
        };
    }
}

// Inicializar el modal cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
    initWelcomeModal();
});

// Llamar al modal después de que cargue la página
window.addEventListener('DOMContentLoaded', () => {
    initWelcomeModal();
});

async function loadData() {
    console.log('🔄 Loading data...');
    try {
        const response = await fetch('../datos/german words.csv');
        if (!response.ok) throw new Error('CSV not found');
        const csvText = await response.text();
        palabras = parseCSV(csvText);
        console.log(`✅ Loaded ${palabras.length} words`);
    } catch (error) { loadDemoData(); }
    
    palabrasFiltradas = [...palabras];
    document.getElementById('totalWords').textContent = palabras.length;
    loadProgress(); loadFavorites(); updateStreak(); 
    loadTopics(); 
    initProgressChart();  
    updateStats();
    loadTopics(); updateFlashcard(); searchDictionary();
    datosCargados = true; fillTopicDatalist();
}

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const words = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        let parts = [], inQuotes = false, currentField = '';
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { parts.push(currentField.trim()); currentField = ''; }
            else currentField += char;
        }
        parts.push(currentField.trim());
        parts = parts.map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 5) {
            const id = parseInt(parts[0]) || words.length + 1;
            const germanFull = parts[1] || '';
            const articleRaw = parts[2] || '';
            const wordRaw = parts[3] || '';
            const translation = parts[4] || '';
            let topic = parts[5] || 'General';
            const article = extractArticle(germanFull, articleRaw);
            let word = cleanWord(germanFull);
            if (!word && wordRaw) word = wordRaw;
            topic = topic.replace(/&amp;/g, '&').trim();
            let example = parts[6] || '', exampleEn = parts[7] || '', plural = parts[8] || '', feminine = parts[9] || '';
            if (example === '—') example = ''; if (exampleEn === '—') exampleEn = '';
            if (plural === '—') plural = ''; if (feminine === '—') feminine = '';
            words.push({ id, german: germanFull, article, word, translation, topic, example, exampleEn, plural, feminine });
        }
    }
    return words;
}

function loadDemoData() {
    palabras = [{ id: 1, german: "der Hund", article: "der", word: "Hund", translation: "dog", topic: "Animals" }];
    palabrasFiltradas = [...palabras];
}

function loadProgress() { const saved = localStorage.getItem('studiedWords'); if (saved) studiedWords = new Set(JSON.parse(saved)); }
function loadFavorites() { const saved = localStorage.getItem('favoriteWords'); if (saved) favoriteWords = new Set(JSON.parse(saved)); }
function saveProgress() { localStorage.setItem('studiedWords', JSON.stringify([...studiedWords])); updateStats(); }
function saveFavorites() { localStorage.setItem('favoriteWords', JSON.stringify([...favoriteWords])); }
function toggleFavorite(id) { if (favoriteWords.has(id)) favoriteWords.delete(id); else favoriteWords.add(id); saveFavorites(); updateFlashcard(); searchDictionary(); }

function updateStats() {
    document.getElementById('studiedCount').textContent = studiedWords.size;
    const percent = palabras.length ? (studiedWords.size / palabras.length * 100).toFixed(0) : 0;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    
    updateProgressChart();  // ← AGREGAR ESTA LÍNEA
}

// ========== GRÁFICO CIRCULAR DE PROGRESO ==========
function initProgressChart() {
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (progressChart) {
        progressChart.destroy();
    }
    
    const studied = studiedWords.size;
    const total = palabras.length;
    const percent = total ? (studied / total * 100).toFixed(1) : 0;
    
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [studied, total - studied],
                backgroundColor: ['#1A5D9C', '#E2E8F0'],
                borderWidth: 0,
                borderRadius: 10,
                spacing: 2,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            }
        }
    });
    
    // Actualizar texto del porcentaje
    const chartPercentage = document.getElementById('chartPercentage');
    if (chartPercentage) chartPercentage.textContent = percent;
}

function updateProgressChart() {
    if (!progressChart) {
        initProgressChart();
        return;
    }
    
    const studied = studiedWords.size;
    const total = palabras.length;
    const percent = total ? (studied / total * 100).toFixed(1) : 0;
    
    progressChart.data.datasets[0].data = [studied, total - studied];
    progressChart.update();
    
    const chartPercentage = document.getElementById('chartPercentage');
    if (chartPercentage) chartPercentage.textContent = percent;
}

function loadTopics() {
    const topics = {};
    palabras.forEach(p => { topics[p.topic] = (topics[p.topic] || 0) + 1; });
    
    // Calcular palabras estudiadas por tema
    const studiedByTopic = {};
    studiedWords.forEach(id => {
        const palabra = palabras.find(p => p.id === id);
        if (palabra) {
            studiedByTopic[palabra.topic] = (studiedByTopic[palabra.topic] || 0) + 1;
        }
    });
    
    const topicList = document.getElementById('topicList');
    if (!topicList) return;
    topicList.innerHTML = '';
    
    // Opción "Todos" con progreso total
    const allTopic = document.createElement('div');
    allTopic.className = 'topic-item active';
    const totalStudied = studiedWords.size;
    const totalWords = palabras.length;
    const totalPercent = totalWords ? Math.round((totalStudied / totalWords) * 100) : 0;
    allTopic.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>📚 All</span>
                <span class="topic-count">${totalStudied}/${totalWords}</span>
            </div>
            <div class="topic-progress-bar" style="margin-top: 4px;">
                <div class="topic-progress-fill" style="width: ${totalPercent}%;"></div>
            </div>
        </div>
    `;
    allTopic.onclick = () => filterByTopic(null);
    topicList.appendChild(allTopic);
    
    // Temas individuales con barra de progreso
    const sortedTopics = Object.keys(topics).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    sortedTopics.forEach(topic => {
        const total = topics[topic];
        const studied = studiedByTopic[topic] || 0;
        const percent = total ? Math.round((studied / total) * 100) : 0;
        
        const topicItem = document.createElement('div');
        topicItem.className = 'topic-item';
        topicItem.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span>${topic}</span>
                    <span class="topic-count">${studied}/${total}</span>
                </div>
                <div class="topic-progress-bar" style="margin-top: 4px;">
                    <div class="topic-progress-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;
        topicItem.onclick = () => filterByTopic(topic);
        topicList.appendChild(topicItem);
    });
    
    const dictFilter = document.getElementById('dictTopicFilter');
    if (dictFilter) {
        dictFilter.innerHTML = '<option value="">All topics</option>';
        sortedTopics.forEach(topic => { dictFilter.innerHTML += `<option value="${topic}">${topic}</option>`; });
    }
}

document.getElementById('topicSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.topic-item:not(:first-child)').forEach(item => {
        const topic = item.textContent.toLowerCase();
        item.style.display = topic.includes(term) ? 'flex' : 'none';
    });
});

function filterByTopic(topic) {
    document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('active'));
    if (event?.target) event.target.closest('.topic-item')?.classList.add('active');
    palabrasFiltradas = topic ? palabras.filter(p => p.topic === topic) : [...palabras];
    currentIndex = 0; shuffled = false; updateFlashcard();
}

function updateFlashcard() {
    if (palabrasFiltradas.length === 0) return;
    const word = palabrasFiltradas[currentIndex];
    const topicColor = temaColors[word.topic] || '#e94560';
    const isFavorite = favoriteWords.has(word.id);
    
    const cardTopic = document.getElementById('cardTopic');
    if (cardTopic) { cardTopic.textContent = word.topic; cardTopic.style.background = topicColor; }
    document.getElementById('cardArticle').textContent = word.article || '';
    document.getElementById('cardWord').textContent = word.word;
    const backTopic = document.getElementById('backTopic');
    if (backTopic) { backTopic.textContent = word.topic; backTopic.style.background = topicColor; }
    document.getElementById('cardTranslation').textContent = word.translation;
    
// Ejemplos con audio (texto centrado, bocina a la derecha)
const exampleContainer = document.getElementById('cardExampleContainer');
const exampleGermanElem = document.getElementById('cardExampleAleman');
const exampleEnElem = document.getElementById('cardExampleIngles');

if (exampleContainer && word.example && word.example !== '—' && word.example !== 'null' && word.example.trim() !== '') {
    // Limpiar contenido anterior
    exampleGermanElem.innerHTML = '';
    exampleGermanElem.style.display = 'flex';
    exampleGermanElem.style.alignItems = 'center';
    exampleGermanElem.style.justifyContent = 'center';
    exampleGermanElem.style.position = 'relative';
    exampleGermanElem.style.cursor = 'pointer';
    exampleGermanElem.style.padding = '8px 12px';
    exampleGermanElem.style.borderRadius = '12px';
    
    // Texto del ejemplo (centrado)
    const textSpan = document.createElement('span');
    textSpan.textContent = `🇩🇪 ${word.example.substring(0, 100)}`;
    textSpan.style.textAlign = 'center';
    textSpan.style.flex = '1';
    
    // Icono de audio (posicionado a la derecha)
    const audioIcon = document.createElement('i');
    audioIcon.className = 'fas fa-volume-up';
    audioIcon.style.fontSize = '1rem';
    audioIcon.style.cursor = 'pointer';
    audioIcon.style.position = 'absolute';
    audioIcon.style.right = '12px';
    audioIcon.style.top = '50%';
    audioIcon.style.transform = 'translateY(-50%)';
    
    exampleGermanElem.appendChild(textSpan);
    exampleGermanElem.appendChild(audioIcon);
    
    // Clic en la bocina reproduce el audio
    audioIcon.onclick = (e) => {
        e.stopPropagation();
        speak(word.example);
    };
    
    // Opcional: también hacer clic en el texto
    textSpan.onclick = (e) => {
        e.stopPropagation();
        speak(word.example);
    };
    
    // Hover effect
    exampleGermanElem.onmouseenter = () => {
        exampleGermanElem.style.backgroundColor = 'rgba(0, 0, 0, 0.04)';
    };
    exampleGermanElem.onmouseleave = () => {
        exampleGermanElem.style.backgroundColor = 'transparent';
    };
    
    // Ejemplo en inglés
    if (word.exampleEn && word.exampleEn !== '—' && word.exampleEn !== 'null') {
        exampleEnElem.textContent = `🇬🇧 ${word.exampleEn.substring(0, 100)}`;
        exampleEnElem.style.display = 'block';
    } else {
        exampleEnElem.style.display = 'none';
    }
    
    exampleContainer.style.display = 'block';
} else {
    exampleContainer.style.display = 'none';
}
    
    const pluralElem = document.getElementById('cardPlural');
    if (pluralElem && word.plural && word.plural !== '—') {
        pluralElem.innerHTML = `📚 Plural: ${word.plural}`;
        pluralElem.style.display = 'block';
    } else if (pluralElem) { pluralElem.style.display = 'none'; }
    
    const feminineContainer = document.getElementById('cardFemeninoContainer');
    const feminineElem = document.getElementById('cardFemenino');
    if (feminineContainer && feminineElem) {
        if (word.feminine && word.feminine.trim() && word.feminine !== '—' && word.feminine !== 'null') {
            feminineElem.innerHTML = `👩 Feminine: ${word.feminine}`;
            feminineContainer.style.display = 'block';
        } else { feminineContainer.style.display = 'none'; }
    }
    
    let favBtn = document.getElementById('favoriteBtn');
    if (!favBtn) { favBtn = document.createElement('button'); favBtn.id = 'favoriteBtn'; favBtn.className = 'favorite-btn'; document.querySelector('.card-front')?.appendChild(favBtn); }
    favBtn.textContent = isFavorite ? '⭐' : '☆';
    favBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
    favBtn.onclick = (e) => { e.stopPropagation(); toggleFavorite(word.id); };
    
    let audioBtn = document.getElementById('audioBtn');
    if (!audioBtn) { audioBtn = document.createElement('button'); audioBtn.id = 'audioBtn'; audioBtn.className = 'audio-btn'; document.querySelector('.card-front')?.appendChild(audioBtn); }
    audioBtn.textContent = '🔊';
    audioBtn.title = 'Listen to pronunciation';
    audioBtn.onclick = (e) => { e.stopPropagation(); speak(word.german); };
    
    document.getElementById('cardCounter').textContent = `${currentIndex + 1} / ${palabrasFiltradas.length}`;
    const flashcard = document.getElementById('flashcard');
    if (flashcard) flashcard.classList.remove('flipped');
}

function nextCard() { currentIndex = (currentIndex + 1) % palabrasFiltradas.length; updateFlashcard(); }
function prevCard() { currentIndex = (currentIndex - 1 + palabrasFiltradas.length) % palabrasFiltradas.length; updateFlashcard(); }
function shuffleWords() { for (let i = palabrasFiltradas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [palabrasFiltradas[i], palabrasFiltradas[j]] = [palabrasFiltradas[j], palabrasFiltradas[i]]; } shuffled = true; currentIndex = 0; updateFlashcard(); }
function markEasy() { 
    studiedWords.add(palabrasFiltradas[currentIndex].id); 
    saveProgress(); 
    loadTopics();
    updateProgressChart();  // ← AGREGAR ESTA LÍNEA
    nextCard(); 
}
function markHard() { nextCard(); }

function startQuiz() { if (!datosCargados && palabras.length === 0) { setTimeout(startQuiz, 100); return; } const quizWords = palabrasFiltradas.length > 0 ? [...palabrasFiltradas] : [...palabras]; quizQuestions = quizWords.sort(() => Math.random() - 0.5).slice(0, 10); quizCurrentIndex = 0; quizScore = 0; updateQuiz(); }
function updateQuiz() { if (quizCurrentIndex >= quizQuestions.length) { document.getElementById('quizQuestion').innerHTML = `🎉 Completed!<br>Score: ${quizScore}/${quizQuestions.length}`; document.getElementById('quizOptions').innerHTML = ''; document.getElementById('quizNext').style.display = 'block'; return; } const q = quizQuestions[quizCurrentIndex]; document.getElementById('quizQuestion').innerHTML = `What does "<strong>${q.german}</strong>" mean?`; document.getElementById('quizScore').textContent = quizScore; document.getElementById('quizTotal').textContent = quizQuestions.length; document.getElementById('quizNext').style.display = 'none'; const others = quizQuestions.filter(p => p.id !== q.id).sort(() => Math.random() - 0.5).slice(0, 3); const options = [q, ...others].sort(() => Math.random() - 0.5); const optionsDiv = document.getElementById('quizOptions'); optionsDiv.innerHTML = ''; options.forEach(opt => { const btn = document.createElement('div'); btn.className = 'quiz-option'; btn.textContent = opt.translation; btn.onclick = () => answerQuiz(btn, opt.id === q.id); optionsDiv.appendChild(btn); }); }
function answerQuiz(btn, correct) { if (btn.classList.contains('correct')) return; if (correct) { btn.classList.add('correct'); quizScore++; document.getElementById('quizScore').textContent = quizScore; } else { btn.classList.add('wrong'); document.querySelectorAll('.quiz-option').forEach(opt => { if (opt.textContent === quizQuestions[quizCurrentIndex].translation) opt.classList.add('correct'); }); } document.getElementById('quizNext').style.display = 'block'; }
function nextQuiz() { quizCurrentIndex++; updateQuiz(); }

function searchDictionary() {
    const searchTerm = document.getElementById('dictSearch')?.value.toLowerCase() || '';
    const topicFilter = document.getElementById('dictTopicFilter')?.value || '';
    let results = palabras;
    if (searchTerm) results = results.filter(p => p.german.toLowerCase().includes(searchTerm) || p.translation.toLowerCase().includes(searchTerm));
    if (topicFilter) results = results.filter(p => p.topic === topicFilter);
    const resultsDiv = document.getElementById('dictionaryResults');
    if (!resultsDiv) return;
    if (results.length === 0) { resultsDiv.innerHTML = '<div class="dict-item">No results found</div>'; return; }
    resultsDiv.innerHTML = results.slice(0, 100).map(p => `<div class="dict-item" data-id="${p.id}"><div class="german"><strong>${p.german}</strong> <button class="favorite-star" data-id="${p.id}">${favoriteWords.has(p.id) ? '⭐' : '☆'}</button> <button class="audio-play" data-word="${p.german}">🔊</button></div><div class="translation">${p.translation}</div><div class="topic">${p.topic}</div><button class="delete-word-btn" data-id="${p.id}">🗑️ Delete</button></div>`).join('');
    document.querySelectorAll('.delete-word-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteWord(parseInt(btn.dataset.id)); }));
    document.querySelectorAll('.favorite-star').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(parseInt(btn.dataset.id)); searchDictionary(); }));
    document.querySelectorAll('.audio-play').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); speak(btn.dataset.word); }));
}

function showForm() { document.getElementById('addWordForm').style.display = 'block'; }
function hideForm() { document.getElementById('addWordForm').style.display = 'none'; clearForm(); }
function clearForm() { ['newAleman', 'newArticulo', 'newTraduccion', 'newTema', 'newEjemplo', 'newEjemploIngles', 'newPlural', 'newFemenino'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
function showMessage(text, type) { const msgDiv = document.getElementById('formMessage'); if (msgDiv) { msgDiv.textContent = text; msgDiv.className = `form-message ${type}`; setTimeout(() => { msgDiv.textContent = ''; msgDiv.className = 'form-message'; }, 3000); } }
function saveNewWord() {
    let german = document.getElementById('newAleman').value.trim();
    let translation = document.getElementById('newTraduccion').value.trim();
    let topic = document.getElementById('newTema').value.trim() || 'General';
    if (!german || !translation) { showMessage('❌ "German word" and "Translation" are required', 'error'); return; }
    let articleToShow = document.getElementById('newArticulo').value;
    let baseWord = german.startsWith('der ') || german.startsWith('die ') || german.startsWith('das ') ? german.split(' ')[1] : german;
    const newId = palabras.length > 0 ? Math.max(...palabras.map(p => p.id)) + 1 : 1;
    palabras.push({ id: newId, german: german, article: articleToShow, word: baseWord, translation: translation, topic: topic, example: document.getElementById('newEjemplo').value.trim() || '', exampleEn: document.getElementById('newEjemploIngles').value.trim() || '', plural: document.getElementById('newPlural').value.trim() || '', feminine: document.getElementById('newFemenino').value.trim() || '' });
    palabrasFiltradas = [...palabras];
    document.getElementById('totalWords').textContent = palabras.length;
    loadTopics(); updateFlashcard(); searchDictionary();
    hideForm(); showMessage(`✅ "${german}" added successfully`, 'success');
}
function deleteWord(id) {
    const word = palabras.find(p => p.id === id);
    if (!word) return;
    if (confirm(`Delete "${word.german}"?`)) {
        palabras = palabras.filter(p => p.id !== id);
        palabrasFiltradas = palabrasFiltradas.filter(p => p.id !== id);
        studiedWords.delete(id); favoriteWords.delete(id);
        document.getElementById('totalWords').textContent = palabras.length;
        saveProgress(); saveFavorites(); updateStats(); loadTopics();
        updateProgressChart();  // ← AGREGAR ESTA LÍNEA
        if (currentIndex >= palabrasFiltradas.length && palabrasFiltradas.length > 0) currentIndex = palabrasFiltradas.length - 1;
        else if (palabrasFiltradas.length === 0) currentIndex = 0;
        updateFlashcard(); searchDictionary();
        showMessage(`✅ "${word.german}" deleted successfully`, 'success');
    }
}
function exportToCSV() {
    const headers = ['id', 'german', 'article', 'word', 'translation', 'topic', 'example (german)', 'example (english)', 'plural', 'feminine'];
    const rows = palabras.map(p => [p.id, `"${p.german.replace(/"/g, '""')}"`, `"${(p.article || '').replace(/"/g, '""')}"`, `"${p.word.replace(/"/g, '""')}"`, `"${p.translation.replace(/"/g, '""')}"`, `"${p.topic.replace(/"/g, '""')}"`, `"${(p.example || '').replace(/"/g, '""')}"`, `"${(p.exampleEn || '').replace(/"/g, '""')}"`, `"${(p.plural || '').replace(/"/g, '""')}"`, `"${(p.feminine || '').replace(/"/g, '""')}"`]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `german_words_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    link.click(); URL.revokeObjectURL(link.href);
    showMessage(`📁 Exported ${palabras.length} words to CSV`, 'success');
}
function savePermanently() {
    const headers = ['id', 'german', 'article', 'word', 'translation', 'topic', 'example (german)', 'example (english)', 'plural', 'feminine'];
    const rows = palabras.map(p => [p.id, `"${(p.german || '').replace(/"/g, '""')}"`, `"${(p.article || '').replace(/"/g, '""')}"`, `"${(p.word || '').replace(/"/g, '""')}"`, `"${(p.translation || '').replace(/"/g, '""')}"`, `"${(p.topic || '').replace(/"/g, '""')}"`, `"${(p.example || '').replace(/"/g, '""')}"`, `"${(p.exampleEn || '').replace(/"/g, '""')}"`, `"${(p.plural || '').replace(/"/g, '""')}"`, `"${(p.feminine || '').replace(/"/g, '""')}"`]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'german words.csv';
    link.click(); URL.revokeObjectURL(link.href);
    showMessage('✅ File downloaded. Replace it in the "datos" folder to save changes permanently', 'success');
}
function fillTopicDatalist() { const topics = [...new Set(palabras.map(p => p.topic))].sort(); const datalist = document.getElementById('temaList'); if (datalist) { datalist.innerHTML = ''; topics.forEach(topic => { const option = document.createElement('option'); option.value = topic; datalist.appendChild(option); }); } }

// ========== GAMES ==========
function startHangman() {
    const available = palabrasFiltradas.length > 0 ? palabrasFiltradas : palabras;
    if (available.length === 0) return;
    const random = available[Math.floor(Math.random() * available.length)];
    hangmanWord = random.word.toLowerCase();
    hangmanTraduccion = random.translation;
    hangmanTema = random.topic;
    hangmanGuessed = []; hangmanWrong = [];
    updateHangman();
}
function updateHangman() {
    document.getElementById('hangmanWordDisplay').innerHTML = hangmanWord.split('').map(l => hangmanGuessed.includes(l) ? l.toUpperCase() : '_').join(' ');
    document.getElementById('hangmanHint').innerHTML = `<div class="hangman-hint-box"><span class="hint-label">💡 Topic:</span> ${hangmanTema}<br><span class="hint-label">📖 Translation:</span> ${hangmanTraduccion}<br><span class="hint-label">🔤 Letters:</span> ${hangmanWord.length}</div><div>❌ Mistakes: ${hangmanWrong.join(', ')}</div>`;
    const states = ['', '\n  O', '\n  O\n  |', '\n  O\n /|', '\n  O\n /|\\', '\n  O\n /|\\\n /', '\n  O\n /|\\\n / \\'];
    document.getElementById('hangmanCanvas').innerHTML = `   +---+\n   |   |${states[hangmanWrong.length]}\n       |\n       |\n       |\n=========`;
    const lettersDiv = document.getElementById('hangmanLetters');
    lettersDiv.innerHTML = '';
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(letter => {
        const l = letter.toLowerCase();
        const btn = document.createElement('button');
        btn.textContent = letter; btn.className = 'letter-btn';
        if (hangmanGuessed.includes(l) || hangmanWrong.includes(l)) { btn.disabled = true; if (hangmanGuessed.includes(l)) btn.classList.add('correct'); else btn.classList.add('wrong'); }
        btn.onclick = () => { if (hangmanWord.includes(l)) hangmanGuessed.push(l); else hangmanWrong.push(l); updateHangman(); };
        lettersDiv.appendChild(btn);
    });
    if (hangmanWord.split('').every(l => hangmanGuessed.includes(l))) document.getElementById('hangmanMessage').innerHTML = '🎉 You won!';
    else if (hangmanWrong.length >= 6) document.getElementById('hangmanMessage').innerHTML = `💀 You lost. The word was: ${hangmanWord.toUpperCase()}`;
}
function generateWordSearch() {
    const available = palabrasFiltradas.slice(0, 8);
    wordsearchWords = available.map(p => p.word.toUpperCase());
    wordsearchFound = new Array(wordsearchWords.length).fill(false);
    const size = 12;
    wordsearchGrid = Array(size).fill().map(() => Array(size).fill(''));
    const dirs = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
    wordsearchWords.forEach(word => {
        for (let attempt = 0; attempt < 100; attempt++) {
            const dir = Math.floor(Math.random() * 8);
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            let ok = true;
            for (let i = 0; i < word.length; i++) {
                const r = row + dirs[dir][0] * i, c = col + dirs[dir][1] * i;
                if (r < 0 || r >= size || c < 0 || c >= size || (wordsearchGrid[r][c] && wordsearchGrid[r][c] !== word[i])) { ok = false; break; }
            }
            if (ok) { for (let i = 0; i < word.length; i++) wordsearchGrid[row + dirs[dir][0] * i][col + dirs[dir][1] * i] = word[i]; break; }
        }
    });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (!wordsearchGrid[i][j]) wordsearchGrid[i][j] = letters[Math.floor(Math.random() * letters.length)];
    displayWordSearch();
}
function displayWordSearch() {
    const gridDiv = document.getElementById('wordsearchGrid');
    gridDiv.innerHTML = '';
    for (let i = 0; i < wordsearchGrid.length; i++) for (let j = 0; j < wordsearchGrid[i].length; j++) { const cell = document.createElement('div'); cell.className = 'ws-cell'; cell.textContent = wordsearchGrid[i][j]; cell.onclick = () => selectWordSearchCell(i, j); gridDiv.appendChild(cell); }
    document.getElementById('wordsearchWords').innerHTML = '<h4>📝 Words to find:</h4>' + wordsearchWords.map((w, i) => `<span class="ws-word ${wordsearchFound[i] ? 'found' : ''}">${w}</span>`).join('');
}
function selectWordSearchCell(row, col) {
    if (!seleccionInicio) { seleccionInicio = { row, col }; document.querySelectorAll('.ws-cell').forEach(c => c.classList.remove('selected')); document.querySelector(`.ws-cell[data-row='${row}'][data-col='${col}']`).classList.add('selected'); }
    else { checkWordSearchWord(seleccionInicio.row, seleccionInicio.col, row, col); seleccionInicio = null; document.querySelectorAll('.ws-cell').forEach(c => c.classList.remove('selected')); }
}
function checkWordSearchWord(r1,c1,r2,c2) {
    let word = '', dr = r2 === r1 ? 0 : (r2 > r1 ? 1 : -1), dc = c2 === c1 ? 0 : (c2 > c1 ? 1 : -1);
    let r = r1, c = c1;
    while (r !== r2 + dr || c !== c2 + dc) { word += wordsearchGrid[r][c]; r += dr; c += dc; }
    const idx = wordsearchWords.findIndex(w => w === word);
    if (idx !== -1 && !wordsearchFound[idx]) { wordsearchFound[idx] = true; displayWordSearch(); document.getElementById('wordsearchMessage').innerHTML = '✅ Word found!'; if (wordsearchFound.every(f => f)) document.getElementById('wordsearchMessage').innerHTML = '🎉 You completed the word search!'; }
    else document.getElementById('wordsearchMessage').innerHTML = '❌ Incorrect word';
    setTimeout(() => document.getElementById('wordsearchMessage').innerHTML = '', 1500);
}
function shareProgress() {
    const studied = studiedWords.size, total = palabras.length, percentage = total ? (studied / total * 100).toFixed(1) : 0;
    alert(`📊 Progress: ${percentage}%\n📚 Studied: ${studied}/${total}\n🔥 Streak: ${localStorage.getItem('streakDays') || 0} days`);
}

// ========== TRAVEL MODE ==========
const scenarios = {
    restaurant: { title: '🍽️ Restaurant', words: ['die Speisekarte', 'der Kellner', 'die Rechnung', 'bestellen', 'bezahlen'] },
    airport: { title: '✈️ Airport', words: ['der Flughafen', 'der Flug', 'der Reisepass', 'das Gepäck', 'einchecken'] },
    hotel: { title: '🏨 Hotel', words: ['das Hotel', 'die Reservierung', 'die Rezeption', 'der Schlüssel', 'das Zimmer'] },
    shopping: { title: '🛍️ Shopping', words: ['das Geschäft', 'der Preis', 'kaufen', 'bezahlen', 'die Größe'] },
    directions: { title: '🗺️ Directions', words: ['die Straße', 'links', 'rechts', 'geradeaus', 'die Kreuzung'] },
    emergency: { title: '🚨 Emergency', words: ['die Polizei', 'der Arzt', 'das Krankenhaus', 'helfen', 'der Notfall'] }
};
// ========== TRAVEL MODE - Dynamic from CSV ==========
const travelScenarios = {
    restaurant: { 
        title: '🍽️ Restaurant', 
        csvTopics: ['Restaurant'],
        keywords: ['die Speisekarte', 'der Kellner', 'die Rechnung', 'bestellen', 'bezahlen', 'das Restaurant']
    },
    airport: { 
        title: '✈️ Airport', 
        csvTopics: ['Airport'],
        keywords: ['der Flughafen', 'der Flug', 'der Reisepass', 'das Gepäck', 'einchecken', 'die Landung']
    },
    hotel: { 
        title: '🏨 Hotel', 
        csvTopics: ['Hotel'],
        keywords: ['das Hotel', 'die Reservierung', 'die Rezeption', 'der Schlüssel', 'das Zimmer', 'das Badezimmer']
    },
    shopping: { 
        title: '🛍️ Shopping', 
        csvTopics: ['Shopping'],
        keywords: ['das Geschäft', 'der Preis', 'kaufen', 'bezahlen', 'die Größe', 'anprobieren']
    },
    directions: { 
        title: '🗺️ Directions', 
        csvTopics: ['Directions'],
        keywords: ['die Straße', 'links', 'rechts', 'geradeaus', 'die Kreuzung', 'der Weg', 'die Ampel']
    },
    emergency: { 
        title: '🚨 Emergency', 
        csvTopics: ['Emergency'],

        keywords: ['die Polizei', 'der Arzt', 'das Krankenhaus', 'helfen', 'der Notfall', 'die Hilfe', 'der Unfall']
    }
};

function showTravelMode(scenarioId) {
    const scenario = travelScenarios[scenarioId];
    if (!scenario) return;
    
    // First, try to get words by CSV topics
    let travelWords = palabras.filter(p => 
        scenario.csvTopics.some(topic => p.topic === topic)
    );
    
    // If no words found by topic, try by keywords
    if (travelWords.length === 0) {
        travelWords = palabras.filter(p => 
            scenario.keywords.some(keyword => 
                p.german.toLowerCase().includes(keyword.toLowerCase()) || 
                p.word.toLowerCase().includes(keyword.toLowerCase())
            )
        );
    }
    
    // If still no words, show a message
    if (travelWords.length === 0) {
        document.getElementById('travelWordsContainer').innerHTML = `
            <div class="travel-empty">
                <p>⚠️ No words found for "${scenario.title}"</p>
                <p>Add words with topic: ${scenario.csvTopics.join(', ')} to your CSV file.</p>
            </div>
        `;
        return;
    }
    
    // Display the words
    document.getElementById('travelWordsContainer').innerHTML = `
        <div class="travel-header-info">
            <h4>${scenario.title}</h4>
            <p class="travel-word-count">📚 ${travelWords.length} words available</p>
        </div>
        <div class="travel-words-grid">
            ${travelWords.map(p => `
                <div class="travel-word-card" onclick="speak('${p.german.replace(/'/g, "\\'")}')">
                    <strong>${p.german}</strong>
                    <span class="travel-translation">${p.translation}</span>
                    <button class="play-sound" data-word="${p.german.replace(/'/g, "\\'")}">🔊</button>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add audio event listeners
    document.querySelectorAll('.play-sound').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            speak(btn.dataset.word);
        };
    });
}

// ========== CSV EDITOR ==========
function showCSVEditor() {
    const editorDiv = document.getElementById('csvEditorTable');
    if (!editorDiv) return;
    const searchTerm = document.getElementById('editorSearch')?.value.toLowerCase() || '';
    let results = palabras;
    if (searchTerm) results = results.filter(p => p.german.toLowerCase().includes(searchTerm) || p.translation.toLowerCase().includes(searchTerm));
    editorDiv.innerHTML = `<table class="editor-table-grid"><thead><tr><th>ID</th><th>German</th><th>Translation</th><th>Topic</th><th>Actions</th></tr></thead><tbody>${results.map(p => `<tr data-id="${p.id}"><td>${p.id}</td><td><input type="text" class="edit-german" value="${p.german.replace(/"/g, '&quot;')}"></td><td><input type="text" class="edit-translation" value="${p.translation.replace(/"/g, '&quot;')}"></td><td><input type="text" class="edit-topic" value="${p.topic.replace(/"/g, '&quot;')}"></td><td><button class="delete-row-btn" data-id="${p.id}">🗑️</button></td></tr>`).join('')}</tbody></table>`;
    editorDiv.querySelectorAll('.delete-row-btn').forEach(btn => btn.addEventListener('click', () => deleteWord(parseInt(btn.dataset.id))));
}
function saveEditorChanges() {
    document.querySelectorAll('#csvEditorTable tbody tr').forEach(row => {
        const id = parseInt(row.dataset.id);
        const word = palabras.find(p => p.id === id);
        if (word) {
            word.german = row.querySelector('.edit-german').value;
            word.translation = row.querySelector('.edit-translation').value;
            word.topic = row.querySelector('.edit-topic').value;
        }
    });
    palabrasFiltradas = [...palabras];
    loadTopics(); updateFlashcard(); searchDictionary();
    showMessage('✅ Changes saved in memory', 'success');
}

// ========== PANEL DISPLAY FUNCTION ==========
function showPanel(type) {
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    let panelId = '';
    if (type === 'study') panelId = 'studyMode';
    else if (type === 'quiz') panelId = 'quizMode';
    else if (type === 'dictionary') panelId = 'dictionaryMode';
    else if (type === 'games') panelId = 'gamesPanel';
    else if (type === 'travel') panelId = 'travelModePanel';
    else if (type === 'editor') panelId = 'csvEditorPanel';
    
    const selectedPanel = document.getElementById(panelId);
    if (selectedPanel) selectedPanel.classList.add('active');
    
    if (type === 'study') updateFlashcard();
    else if (type === 'quiz') startQuiz();
    else if (type === 'dictionary') searchDictionary();
    else if (type === 'games') { startHangman(); document.querySelectorAll('.game-tab').forEach(tab => { tab.classList.remove('active'); if (tab.dataset.game === 'hangman') tab.classList.add('active'); }); document.getElementById('hangmanGame').style.display = 'block'; document.getElementById('wordsearchGame').style.display = 'none'; }
    else if (type === 'travel') showTravelMode('restaurant');
    else if (type === 'editor') showCSVEditor();
}

// ========== EVENT LISTENERS ==========
document.getElementById('flashcard')?.addEventListener('click', () => document.getElementById('flashcard')?.classList.toggle('flipped'));
document.getElementById('prevCard')?.addEventListener('click', prevCard);
document.getElementById('nextCard')?.addEventListener('click', nextCard);
document.getElementById('easyBtn')?.addEventListener('click', markEasy);
document.getElementById('hardBtn')?.addEventListener('click', markHard);
document.getElementById('shuffleBtn')?.addEventListener('click', shuffleWords);
document.getElementById('quizNext')?.addEventListener('click', nextQuiz);
document.getElementById('dictSearch')?.addEventListener('input', searchDictionary);
document.getElementById('dictTopicFilter')?.addEventListener('change', searchDictionary);
document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);
document.getElementById('saveToFileBtn')?.addEventListener('click', savePermanently);
document.getElementById('showAddWordBtn')?.addEventListener('click', showForm);
document.getElementById('cancelAddWordBtn')?.addEventListener('click', hideForm);
document.getElementById('saveWordBtn')?.addEventListener('click', saveNewWord);
document.getElementById('newHangmanGame')?.addEventListener('click', startHangman);
document.getElementById('newWordsearch')?.addEventListener('click', generateWordSearch);
document.getElementById('shareProgressBtn')?.addEventListener('click', shareProgress);
document.getElementById('saveCsvChanges')?.addEventListener('click', saveEditorChanges);
document.getElementById('editorSearch')?.addEventListener('input', showCSVEditor);
document.getElementById('showGamesMenuBtn')?.addEventListener('click', () => showPanel('games'));
document.getElementById('showTravelModeBtn')?.addEventListener('click', () => showPanel('travel'));
document.getElementById('showCsvEditorBtn')?.addEventListener('click', () => showPanel('editor'));
document.getElementById('closeGamesPanel')?.addEventListener('click', () => showPanel('study'));
document.getElementById('closeTravelPanel')?.addEventListener('click', () => showPanel('study'));
document.getElementById('closeEditorPanel')?.addEventListener('click', () => showPanel('study'));

document.querySelectorAll('.game-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('hangmanGame').style.display = tab.dataset.game === 'hangman' ? 'block' : 'none';
        document.getElementById('wordsearchGame').style.display = tab.dataset.game === 'wordsearch' ? 'block' : 'none';
        if (tab.dataset.game === 'wordsearch') generateWordSearch();
        else startHangman();
    });
});

document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => showTravelMode(btn.dataset.scenario));
});

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showPanel(btn.dataset.mode);
    };
});

// ========== MENÚ MÓVIL ==========
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.topic-item, .mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
}

// Llamar a la función después de cargar
window.addEventListener('DOMContentLoaded', initMobileMenu);

loadData();
