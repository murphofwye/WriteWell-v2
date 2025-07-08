// --- Constants and State ---
const defaultSettings = { work: 25, break: 5, sprints: 4 };
const projectKey = "writing-pomodoro-projects-v2";
let projects = JSON.parse(localStorage.getItem(projectKey)) || {};
let currentProject = null;

// Timer State
let timerInterval = null;
let timeLeft = 0; // seconds
let sprintIndex = 0;
let isWork = true;
let sprintsDone = 0;

// --- DOM Elements ---
const projectSelect = document.getElementById('projectSelect'); // Projects tab
const timerProjectSelect = document.getElementById('timerProjectSelect'); // Timer tab
const newProjectBtn = document.getElementById('newProjectBtn');
const modalBackdrop = document.getElementById('modalBackdrop');
const projectNameInput = document.getElementById('projectNameInput');
const createProjectBtn = document.getElementById('createProjectBtn');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');

const workLengthInput = document.getElementById('workLength');
const breakLengthInput = document.getElementById('breakLength');
const sprintCountInput = document.getElementById('sprintCount');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const savedPopup = document.getElementById('savedPopup');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timeDisplay = document.getElementById('timeDisplay');
const timerLabel = document.getElementById('timerLabel');
const sprintDisplay = document.getElementById('sprintDisplay');

const timerCircle = document.querySelector('.progress');
const wordModal = document.getElementById('wordModal');
const wordCountInput = document.getElementById('wordCountInput');
const saveWordBtn = document.getElementById('saveWordBtn');

const congratsModal = document.getElementById('congratsModal');
const closeCongratsBtn = document.getElementById('closeCongratsBtn');
const confettiDiv = document.getElementById('confetti');
const projectProgress = document.getElementById('projectProgress');
const dingSound = document.getElementById('dingSound');
const successSound = document.getElementById('successSound');

const calendarContainer = document.getElementById('calendarContainer');

// Tab controls
const tabs = [
  { tab: 'timer', btn: document.getElementById('tab-timer'), content: document.getElementById('content-timer') },
  { tab: 'settings', btn: document.getElementById('tab-settings'), content: document.getElementById('content-settings') },
  { tab: 'projects', btn: document.getElementById('tab-projects'), content: document.getElementById('content-projects') }
];

// --- Utility Functions ---
function saveProjects() {
  localStorage.setItem(projectKey, JSON.stringify(projects));
}

function showSavedPopup() {
  savedPopup.classList.remove('hidden');
  setTimeout(() => savedPopup.classList.add('hidden'), 1400);
}

function updateProjectSelects() {
  // For both timer and projects tab
  [projectSelect, timerProjectSelect].forEach(sel => {
    sel.innerHTML = '';
    Object.keys(projects).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    if (!projects[currentProject]) {
      currentProject = Object.keys(projects)[0] || null;
    }
    if (currentProject) sel.value = currentProject;
  });
}

function showModal(modal) {
  modal.classList.remove('hidden');
}

function hideModal(modal) {
  modal.classList.add('hidden');
}

function loadProjectSettings() {
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  workLengthInput.value = settings.work;
  breakLengthInput.value = settings.break;
  sprintCountInput.value = settings.sprints;
  updateProgressDisplay();
}

function setTimerState() {
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  sprintIndex = projects[currentProject].progress.sprintIndex || 0;
  isWork = projects[currentProject].progress.isWork ?? true;
  sprintsDone = sprintIndex;
  updateTimerDisplay();
  updateProgressDisplay();
}

function resetTimerState() {
  if (!currentProject || !projects[currentProject]) return;
  sprintIndex = 0;
  isWork = true;
  sprintsDone = 0;
  projects[currentProject].progress.sprintIndex = 0;
  projects[currentProject].progress.isWork = true;
  saveProjects();
  updateTimerDisplay();
  updateProgressDisplay();
}

function updateTimerDisplay() {
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  let total = isWork ? settings.work * 60 : settings.break * 60;
  let label = isWork ? "Work" : "Break";
  timerLabel.textContent = label;
  let sprintText = isWork
    ? `Sprint ${Math.min(sprintIndex + 1, settings.sprints)}/${settings.sprints}`
    : `Break`;
  sprintDisplay.textContent = sprintText;
  let mins = Math.floor(timeLeft / 60);
  let secs = timeLeft % 60;
  timeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
  updateCircle(total, timeLeft);
}

function updateCircle(total, left) {
  const r = 120;
  const circ = 2 * Math.PI * r;
  let frac = left / total;
  frac = Math.max(0, Math.min(1, frac));
  timerCircle.style.strokeDasharray = circ;
  timerCircle.style.strokeDashoffset = circ * (1 - frac);
}

function updateProgressDisplay() {
  if (!currentProject || !projects[currentProject]) {
    projectProgress.innerHTML = "<em>No project selected.</em>";
    return;
  }
  const prog = projects[currentProject].progress;
  let words = prog.sprintWords || [];
  let total = words.reduce((a, b) => a + b, 0);
  let html = `Sprints done: ${prog.sprintIndex || 0}/${projects[currentProject].settings.sprints}<br>`;
  html += `Total words: <strong>${total}</strong><br>`;
  html += words.map((w, i) => `Sprint ${i + 1}: ${w} words`).join('<br>');
  projectProgress.innerHTML = html;
}

// --- Timer Logic ---
function startTimer() {
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  if (timerInterval) return;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = true;

  let duration = isWork ? settings.work * 60 : settings.break * 60;
  if (!timeLeft) timeLeft = duration;

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      // Play sound for sprint/break end
      dingSound.currentTime = 0;
      dingSound.play();
      handleTimerEnd();
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = false;
  }
}

function resetTimer() {
  if (!currentProject || !projects[currentProject]) return;
  pauseTimer();
  resetTimerState();
  const settings = projects[currentProject].settings;
  timeLeft = settings.work * 60;
  updateTimerDisplay();
  startBtn.disabled = false;
  resetBtn.disabled = true;
  pauseBtn.disabled = true;
}

// Work/Break individual countdowns, always alternate, auto-advance except for word modal
function handleTimerEnd() {
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  if (isWork) {
    // Work session finished, prompt word count
    showModal(wordModal);
    wordCountInput.value = "";
    wordCountInput.focus();
  } else {
    // Break finished, advance to next work sprint, or finish
    sprintIndex += 1;
    projects[currentProject].progress.sprintIndex = sprintIndex;
    projects[currentProject].progress.isWork = true;
    saveProjects();

    if (sprintIndex >= settings.sprints) {
      showCongrats();
      return;
    }
    // Advance to next work session automatically
    isWork = true;
    timeLeft = settings.work * 60;
    updateTimerDisplay();
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = true;
    startTimer(); // auto starts next work session
  }
}

// Save wordcount and auto-start break
function saveSprintWords() {
  if (!currentProject || !projects[currentProject]) return;
  const wc = parseInt(wordCountInput.value, 10) || 0;
  let prog = projects[currentProject].progress;
  if (!prog.sprintWords) prog.sprintWords = [];
  if (!prog.sessionHistory) prog.sessionHistory = [];
  prog.sprintWords[sprintIndex] = wc;
  prog.sprintIndex = sprintIndex + 1;
  prog.isWork = false;
  // Save this sprint to session history with date
  let today = getYMD(new Date());
  let session = prog.sessionHistory.find(s => s.date === today);
  if (!session) {
    session = {date: today, words: []};
    prog.sessionHistory.push(session);
  }
  // Save words for this sprint for today
  session.words[sprintIndex] = wc;
  saveProjects();
}

function closeWordModalAndAdvance() {
  hideModal(wordModal);
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  isWork = false;
  timeLeft = settings.break * 60;
  updateProgressDisplay();
  updateTimerDisplay();
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = true;
  startTimer(); // auto start break!
}

// --- Project Logic ---
function createProject(name) {
  if (!name || projects[name]) return false;
  projects[name] = {
    settings: { ...defaultSettings },
    progress: { sprintWords: [], sprintIndex: 0, isWork: true, sessionHistory: [] }
  };
  currentProject = name;
  saveProjects();
  updateProjectSelects();
  return true;
}

function switchProject(name) {
  if (!projects[name]) return;
  currentProject = name;
  saveProjects();
  updateProjectSelects();
  loadProjectSettings();
  setTimerState();
  showCalendar();
}

function saveSettingsToProject() {
  if (!currentProject || !projects[currentProject]) return;
  const work = Math.max(1, parseInt(workLengthInput.value, 10) || 25);
  const brk = Math.max(1, parseInt(breakLengthInput.value, 10) || 5);
  const sprints = Math.max(1, parseInt(sprintCountInput.value, 10) || 4);
  projects[currentProject].settings = { work, break: brk, sprints };
  saveProjects();
  resetTimerState();
  timeLeft = work * 60;
  updateTimerDisplay();
  updateProgressDisplay();
  showSavedPopup();
}

// --- Congratulations Modal & Confetti ---
function showCongrats() {
  showModal(congratsModal);
  launchConfetti();
  // Play unique session completion sound
  if (successSound) {
    successSound.currentTime = 0;
    successSound.play();
  }
}

function launchConfetti() {
  confettiDiv.innerHTML = '';
  // Simple confetti animation
  for (let i = 0; i < 70; i++) {
    let el = document.createElement("div");
    el.className = "confettiPiece";
    let color = `hsl(${Math.random() * 360},88%,65%)`;
    let left = Math.random() * 100;
    let delay = Math.random() * 1.5;
    let duration = 1.2 + Math.random() * 1.2;
    el.style = `
      position:absolute;
      top:-20px; left:${left}%;
      width:10px;height:16px;
      border-radius:4px;
      background:${color};
      opacity:0.86;
      animation:confettiDrop ${duration}s ${delay}s both cubic-bezier(.22,.61,.36,1);
    `;
    confettiDiv.appendChild(el);
  }
}

closeCongratsBtn.addEventListener('click', () => {
  hideModal(congratsModal);
  resetTimer();
  confettiDiv.innerHTML = '';
});

// --- Confetti Keyframes ---
const style = document.createElement('style');
style.innerHTML = `
@keyframes confettiDrop {
  0% {transform:translateY(0) rotate(0deg);}
  100% {transform:translateY(460px) rotate(360deg);}
}
`;
document.head.appendChild(style);

// --- Tab Handling ---
tabs.forEach(({tab, btn, content}) => {
  btn.addEventListener('click', () => {
    tabs.forEach(({btn, content}) => {
      btn.setAttribute('aria-selected', false);
      content.classList.add('hidden');
    });
    btn.setAttribute('aria-selected', true);
    content.classList.remove('hidden');
    if (tab === 'projects') showCalendar();
  });
});

// --- Event Listeners ---
newProjectBtn.addEventListener('click', () => {
  projectNameInput.value = '';
  showModal(modalBackdrop);
  setTimeout(() => projectNameInput.focus(), 100);
});

cancelProjectBtn.addEventListener('click', () => hideModal(modalBackdrop));
createProjectBtn.addEventListener('click', () => {
  const name = projectNameInput.value.trim();
  if (!name) return;
  if (projects[name]) {
    alert('Project already exists!');
    return;
  }
  createProject(name);
  hideModal(modalBackdrop);
  loadProjectSettings();
  setTimerState();
  updateProjectSelects();
  showCalendar();
});

projectSelect.addEventListener('change', e => {
  switchProject(e.target.value);
});

timerProjectSelect.addEventListener('change', e => {
  switchProject(e.target.value);
});

saveSettingsBtn.addEventListener('click', saveSettingsToProject);

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

saveWordBtn.addEventListener('click', () => {
  saveSprintWords();
  sprintIndex += 1;
  sprintsDone = sprintIndex;
  if (!currentProject || !projects[currentProject]) return;
  const settings = projects[currentProject].settings;
  if (sprintIndex >= settings.sprints) {
    hideModal(wordModal);
    showCongrats();
    return;
  }
  closeWordModalAndAdvance();
});

// --- Calendar (Projects Tab) ---
function getYMD(dt) {
  return dt.toISOString().slice(0,10);
}
function todayYMD() {
  return getYMD(new Date());
}

function sumArray(a) {
  return (a||[]).reduce((x,y)=>x+(y||0),0);
}

// Render a monthly calendar for the selected project, with word counts on days
function showCalendar() {
  if (!currentProject || !projects[currentProject]) {
    calendarContainer.innerHTML = "<em>No project selected.</em>";
    return;
  }
  const prog = projects[currentProject].progress;
  let sessionHistory = prog.sessionHistory || [];

  let now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let first = new Date(year, month, 1);
  let last = new Date(year, month+1, 0);
  let startDay = first.getDay(); // 0=Sun
  let daysInMonth = last.getDate();

  // Map date string -> total words
  let wordMap = {};
  sessionHistory.forEach(s => {
    wordMap[s.date] = sumArray(s.words);
  });

  // Calendar Table
  let html = `<div class="calendar-title">${now.toLocaleString('default',{month:'long',year:'numeric'})}</div>`;
  html += `<table class="calendar-table"><thead><tr>`;
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => html += `<th>${d}</th>`);
  html += `</tr></thead><tbody><tr>`;

  let day = 1;
  for (let i=0; i<startDay; ++i) html += `<td></td>`;
  for (; day<=daysInMonth; ++day) {
    let ymd = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
    let word = wordMap[ymd] || 0;
    let isToday = ymd === todayYMD() ? "calendar-today" : "";
    html += `<td class="${isToday}" data-wordcount="${word>0?word:''}">${day}${word>0?`<span class="wordcount-badge">${word}</span>`:""}</td>`;
    if ((startDay+day)%7===0 && day!==daysInMonth) html += `</tr><tr>`;
  }
  let lastDay = (startDay+daysInMonth)%7;
  if (lastDay !== 0) for (let i=lastDay;i<7;++i) html += `<td></td>`;
  html += `</tr></tbody></table>`;
  calendarContainer.innerHTML = html;
}

// --- App Initialization ---
function init() {
  updateProjectSelects();
  if (!currentProject && Object.keys(projects).length === 0) {
    createProject("My First Project");
    currentProject = "My First Project";
  }
  if (!currentProject) currentProject = Object.keys(projects)[0];
  updateProjectSelects();
  loadProjectSettings();
  setTimerState();
  timeLeft = projects[currentProject]?.settings?.work * 60 || 1500;
  updateTimerDisplay();
  updateProgressDisplay();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
  showCalendar();
}

init();