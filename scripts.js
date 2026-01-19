function toggleNav() {
    const menu = document.getElementById('mainMenu');
    menu.classList.toggle('show');
}

function jumpToQuiz() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('quizSection').style.display = 'flex';
    document.getElementById('topNav').style.display = 'none';
    window.scrollTo(0, 0);
}

function goHome() {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('topNav').style.display = 'block';
    
    clearQuizData();
    
    window.scrollTo(0, 0);
}

function beginQuiz(topicId) {
    document.getElementById('selectedTopic').value = topicId;
    jumpToQuiz();
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            if (targetId === '#quiz') {
                e.preventDefault();
                jumpToQuiz();
                return;
            }
            
            const targetEl = document.querySelector(targetId);
            if (targetEl && document.getElementById('landingPage').style.display !== 'none') {
                e.preventDefault();
                targetEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                document.getElementById('mainMenu').classList.remove('show');
            }
        });
    });
});

function sendMessage(e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    e.target.reset();
}

let quizData = [];
let currentIndex = 0;
let totalScore = 0;
let correctCount = 0;
let wrongCount = 0;
let countdown;
let timeRemaining;
let secondsPerQ;
let startTime;
let elapsedTime = 0;

const configPanel = document.querySelector('.config-panel');
const playPanel = document.querySelector('.play-panel');
const summaryPanel = document.querySelector('.summary-panel');

document.getElementById('btnBegin').addEventListener('click', initQuiz);
document.getElementById('btnNext').addEventListener('click', moveToNext);
document.getElementById('btnRestart').addEventListener('click', resetQuiz);

async function initQuiz() {
    const topic = document.getElementById('selectedTopic').value;
    const level = document.getElementById('levelChoice').value;
    const qCount = document.getElementById('questionCount').value;
    secondsPerQ = parseInt(document.getElementById('timeLimit').value);

    let apiUrl = `https://opentdb.com/api.php?amount=${qCount}&type=multiple`;
    if (topic) apiUrl += `&category=${topic}`;
    if (level) apiUrl += `&difficulty=${level}`;

    try {
        configPanel.innerHTML = '<div class="loading">Loading questions...</div>';
        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.response_code !== 0) {
            throw new Error('Failed to fetch questions');
        }

        quizData = result.results.map(item => {
            const allChoices = [...item.incorrect_answers, item.correct_answer];
            for (let i = allChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
            }

            return {
                question: cleanHTML(item.question),
                answers: allChoices.map(ans => cleanHTML(ans)),
                correctAnswer: cleanHTML(item.correct_answer),
                difficulty: item.difficulty
            };
        });

        quizData.sort(() => Math.random() - 0.5);

        configPanel.classList.remove('show');
        playPanel.classList.add('show');
        showQuestion();
    } catch (error) {
        configPanel.innerHTML = `
            <div class="error">Failed to load questions. Please try again.</div>
            <button onclick="location.reload()">Retry</button>
        `;
    }
}

function cleanHTML(text) {
    const temp = document.createElement('textarea');
    temp.innerHTML = text;
    return temp.value;
}

function showQuestion() {
    const current = quizData[currentIndex];
    startTime = Date.now();

    document.getElementById('qNumber').textContent =
        `Question ${currentIndex + 1} of ${quizData.length}`;
    document.getElementById('questionDisplay').textContent = current.question;

    const choicesBox = document.getElementById('answerChoices');
    choicesBox.innerHTML = '';

    current.answers.forEach(ans => {
        const choiceEl = document.createElement('div');
        choiceEl.className = 'choice';
        choiceEl.textContent = ans;
        choiceEl.addEventListener('click', () => pickAnswer(ans, choiceEl));
        choicesBox.appendChild(choiceEl);
    });

    document.getElementById('btnNext').disabled = true;
    beginTimer();
}

function beginTimer() {
    timeRemaining = secondsPerQ;
    refreshTimer();

    countdown = setInterval(() => {
        timeRemaining--;
        refreshTimer();

        if (timeRemaining <= 0) {
            clearInterval(countdown);
            timeExpired();
        }
    }, 1000);
}

function refreshTimer() {
    document.getElementById('clockDisplay').textContent = `${timeRemaining}s`;
    const percent = (timeRemaining / secondsPerQ) * 100;
    document.getElementById('progressFill').style.width = `${percent}%`;
}

function pickAnswer(chosen, chosenEl) {
    if (document.querySelector('.choice.picked')) return;

    clearInterval(countdown);
    const timeTaken = (Date.now() - startTime) / 1000;
    elapsedTime += timeTaken;

    const current = quizData[currentIndex];
    const isRight = chosen === current.correctAnswer;

    chosenEl.classList.add('picked');

    document.querySelectorAll('.choice').forEach(el => {
        el.style.cursor = 'default';
        if (el.textContent === current.correctAnswer) {
            el.classList.add('right');
        }
    });

    if (isRight) {
        correctCount++;
        const speedBonus = Math.floor((timeRemaining / secondsPerQ) * 10);
        const diffBonus = current.difficulty === 'hard' ? 15 :
            current.difficulty === 'medium' ? 10 : 5;
        totalScore += 10 + speedBonus + diffBonus;
    } else {
        wrongCount++;
        chosenEl.classList.add('wrong');
    }

    document.getElementById('btnNext').disabled = false;
}

function timeExpired() {
    wrongCount++;
    elapsedTime += secondsPerQ;

    const current = quizData[currentIndex];
    document.querySelectorAll('.choice').forEach(el => {
        el.style.cursor = 'default';
        if (el.textContent === current.correctAnswer) {
            el.classList.add('right');
        }
    });

    document.getElementById('btnNext').disabled = false;
}

function moveToNext() {
    currentIndex++;

    if (currentIndex < quizData.length) {
        showQuestion();
    } else {
        displayResults();
    }
}

function displayResults() {
    playPanel.classList.remove('show');
    summaryPanel.classList.add('show');

    const percent = Math.round((correctCount / quizData.length) * 100);
    const avgSeconds = Math.round(elapsedTime / quizData.length);

    document.getElementById('totalPoints').textContent = totalScore;
    document.getElementById('rightAnswers').textContent = correctCount;
    document.getElementById('wrongAnswers').textContent = wrongCount;
    document.getElementById('percentCorrect').textContent = `${percent}%`;
    document.getElementById('averageTime').textContent = `${avgSeconds}s`;
}

function resetQuiz() {
    clearQuizData();
    
    summaryPanel.classList.remove('show');
    configPanel.classList.add('show');
    configPanel.innerHTML = `
        <div class="input-group">
            <label for="selectedTopic">Category:</label>
            <select id="selectedTopic">
                <option value="">Any Category</option>
                <option value="9">General Knowledge</option>
                <option value="10">Books</option>
                <option value="17">Science & Nature</option>
                <option value="18">Computers</option>
                <option value="21">Sports</option>
                <option value="23">History</option>
            </select>
        </div>
        <div class="input-group">
            <label for="levelChoice">Difficulty:</label>
            <select id="levelChoice">
                <option value="">Any Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
            </select>
        </div>
        <div class="input-group">
            <label for="questionCount">Number of Questions (5-20):</label>
            <input type="number" id="questionCount" min="5" max="20" value="10">
        </div>
        <div class="input-group">
            <label for="timeLimit">Time per Question (seconds):</label>
            <input type="number" id="timeLimit" min="10" max="120" value="30">
        </div>
        <button id="btnBegin">Start Quiz</button>
    `;

    document.getElementById('btnBegin').addEventListener('click', initQuiz);
}

function clearQuizData() {
    quizData = [];
    currentIndex = 0;
    totalScore = 0;
    correctCount = 0;
    wrongCount = 0;
    elapsedTime = 0;
    clearInterval(countdown);
    
    configPanel.classList.add('show');
    playPanel.classList.remove('show');
    summaryPanel.classList.remove('show');
}