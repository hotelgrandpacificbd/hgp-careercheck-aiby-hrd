let currentDepartment = '';
let currentPosition = '';
let chatHistory = [];
let questionCount = 0;
let timerInterval = null;
let timeRemaining = 300; // 5 minutes in seconds

const setupScreen = document.getElementById('setup-screen');
const interviewScreen = document.getElementById('interview-screen');
const loadingScreen = document.getElementById('loading-screen');
const resultScreen = document.getElementById('result-screen');

const setupForm = document.getElementById('setup-form');
const chatForm = document.getElementById('chat-form');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const typingIndicator = document.getElementById('typing-indicator');
const timerBadge = document.getElementById('timer-badge');
const endInterviewBtn = document.getElementById('end-interview-btn');

setupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  currentDepartment = document.getElementById('department').value;
  currentPosition = document.getElementById('position').value;

  setupScreen.classList.remove('active');
  interviewScreen.classList.add('active');
  timerBadge.classList.remove('hidden');

  startTimer();
  
  // Initial AI welcome question
  const initialPrompt = `Hello! I am ready for the interview for ${currentPosition} in ${currentDepartment}.`;
  await sendChatMessage(initialPrompt, true);
});

function startTimer() {
  timerInterval = setInterval(() => {
    timeRemaining--;
    const mins = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const secs = (timeRemaining % 60).toString().padStart(2, '0');
    timerBadge.textContent = `${mins}:${secs}`;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      finishInterview();
    }
  }, 1000);
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage('user', text);
  userInput.value = '';
  questionCount++;

  await sendChatMessage(text, false);

  if (questionCount >= 7) {
    finishInterview();
  }
});

endInterviewBtn.addEventListener('click', finishInterview);

async function sendChatMessage(messageText, isSystemInit = false) {
  if (!isSystemInit) {
    chatHistory.push({ role: 'user', text: messageText });
  }

  showTyping(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department: currentDepartment,
        position: currentPosition,
        history: chatHistory
      })
    });

    const data = await res.json();
    showTyping(false);

    if (data.text) {
      chatHistory.push({ role: 'ai', text: data.text });
      appendMessage('ai', data.text);
    }
  } catch (err) {
    showTyping(false);
    appendMessage('ai', 'Error connecting to interviewer. Please check your internet connection.');
  }
}

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('msg', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping(show) {
  if (show) {
    typingIndicator.classList.remove('hidden');
  } else {
    typingIndicator.classList.add('hidden');
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function finishInterview() {
  clearInterval(timerInterval);
  interviewScreen.classList.remove('active');
  timerBadge.classList.add('hidden');
  loadingScreen.classList.add('active');

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        department: currentDepartment,
        position: currentPosition,
        history: chatHistory
      })
    });

    const data = await res.json();
    renderResults(data);
  } catch (err) {
    alert('Failed to evaluate interview. Please try again.');
    window.location.reload();
  }
}

function renderResults(data) {
  loadingScreen.classList.remove('active');
  resultScreen.classList.add('active');

  const recBadge = document.getElementById('rec-badge');
  recBadge.textContent = data.recommendation;
  
  const recClass = data.recommendation.toLowerCase().replace(/\s+/g, '-');
  recBadge.className = `badge-rec ${recClass}`;

  document.getElementById('overall-score').textContent = `${data.overallScore} / 100`;
  document.getElementById('career-readiness').textContent = data.careerReadiness;
  document.getElementById('assessment-summary').textContent = data.assessmentSummary;

  const compsList = document.getElementById('competencies-list');
  compsList.innerHTML = '';
  for (const [key, val] of Object.entries(data.competencies)) {
    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    compsList.innerHTML += `<div class="comp-item"><span>${formattedKey}</span><strong>${val}%</strong></div>`;
  }

  const strengthsList = document.getElementById('strengths-list');
  strengthsList.innerHTML = data.strengths.map(s => `<li>${s}</li>`).join('');

  const improveList = document.getElementById('improve-list');
  improveList.innerHTML = data.areasToImprove.map(a => `<li>${a}</li>`).join('');

  const rolesList = document.getElementById('roles-list');
  rolesList.innerHTML = data.bestFitRoles.map(r => `<span class="role-tag">${r}</span>`).join('');
}