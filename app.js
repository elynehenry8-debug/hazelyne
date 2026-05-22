// app.js - Main Application Logic and State Management
import { classifyEmotion, getMotivationalQuote } from './nlp.js';
import { initAudio, setMasterVolume, setSoundscapeVolume, toggleSoundscape, stopAll } from './synth.js';

// Application State
const state = {
  currentTab: 'chat',
  userEmotion: 'calm',
  chatHistory: [
    { sender: 'bot', text: "Hello! I am Serenity, your mental wellness companion. Type or speak to me about how you are feeling, and I will help you find calm, gratitude, and grounding.", time: getFormattedTime() }
  ],
  speech: {
    recognizing: false,
    recognition: null
  },
  breathing: {
    timer: null,
    phaseTimer: null,
    secondsLeft: 0,
    cycleMode: 'box', // 'box' (4-4-4-4) or 'relax' (4-7-8)
    phase: 'idle', // 'inhale', 'hold1', 'exhale', 'hold2', 'idle'
    count: 0
  },
  grounding: {
    step: 5,
    inputs: { 5: [], 4: [], 3: [], 2: [], 1: [] }
  }
};

// Emotion Themes Config (corresponds to CSS variable changes)
const EMOTION_THEMES = {
  calm: {
    c1: 'rgba(77, 208, 225, 0.6)',  // Soft Cyan
    c2: 'rgba(38, 166, 154, 0.6)',  // Soft Teal
    pulse: '8s',
    label: 'Calm & Centered'
  },
  joy: {
    c1: 'rgba(255, 209, 102, 0.6)', // Warm Gold
    c2: 'rgba(251, 133, 0, 0.5)',   // Soft Orange
    pulse: '5s',
    label: 'Joyful & Grateful'
  },
  sadness: {
    c1: 'rgba(162, 155, 254, 0.6)', // Lavender
    c2: 'rgba(108, 92, 231, 0.5)',  // Deep Purple
    pulse: '12s',
    label: 'Sad & Reflective'
  },
  anxiety: {
    c1: 'rgba(129, 199, 132, 0.6)', // Soft Sage Green
    c2: 'rgba(77, 182, 172, 0.5)',  // Soft Aqua
    pulse: '6s',
    label: 'Anxious & Overwhelmed'
  },
  anger: {
    c1: 'rgba(255, 138, 101, 0.6)', // Terracotta / Coral
    c2: 'rgba(239, 83, 80, 0.5)',   // Soft Rose Red
    pulse: '4s',
    label: 'Frustrated & Intense'
  }
};

// DOM Elements Cache
let elements = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  initializeUI();
  setupEventListeners();
  loadLogsHistory();
  initSpeechRecognition();
  updateSerenityVisuals('calm');
  renderQuote();
});

function cacheDOMElements() {
  elements = {
    // Navigation Tabs
    navChat: document.getElementById('nav-chat'),
    navExercises: document.getElementById('nav-exercises'),
    navSounds: document.getElementById('nav-sounds'),
    navHistory: document.getElementById('nav-history'),
    
    // Pages
    tabChat: document.getElementById('tab-chat'),
    tabExercises: document.getElementById('tab-exercises'),
    tabSounds: document.getElementById('tab-sounds'),
    tabHistory: document.getElementById('tab-history'),

    // Serenity Elements
    serenitySphere: document.getElementById('serenity-sphere'),
    serenityPulseText: document.getElementById('serenity-pulse-text'),
    serenityMoodName: document.getElementById('serenity-mood-name'),

    // Chat Elements
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatMicBtn: document.getElementById('chat-mic-btn'),

    // Breathing Elements
    breathCircle: document.getElementById('breath-circle'),
    breathTimerText: document.getElementById('breath-timer-text'),
    breathInstruction: document.getElementById('breath-instruction'),
    btnStartBoxBreath: document.getElementById('btn-start-box-breath'),
    btnStartRelaxBreath: document.getElementById('btn-start-relax-breath'),
    btnStopBreath: document.getElementById('btn-stop-breath'),

    // Grounding Elements
    groundingSection: document.getElementById('grounding-section'),
    groundingPrompt: document.getElementById('grounding-prompt'),
    groundingInput: document.getElementById('grounding-input'),
    groundingSubmitBtn: document.getElementById('grounding-submit-btn'),
    groundingList: document.getElementById('grounding-list'),
    groundingProgress: document.getElementById('grounding-progress'),

    // Gratitude Journal Elements
    gratitudeForm: document.getElementById('gratitude-form'),
    gratitudeInput1: document.getElementById('gratitude-1'),
    gratitudeInput2: document.getElementById('gratitude-2'),
    gratitudeInput3: document.getElementById('gratitude-3'),
    gratitudeSubmitBtn: document.getElementById('gratitude-submit'),

    // Reframer Elements
    reframerForm: document.getElementById('reframer-form'),
    negativeThoughtInput: document.getElementById('negative-thought'),
    reframedThoughtInput: document.getElementById('reframed-thought'),
    reframerSubmitBtn: document.getElementById('reframer-submit'),

    // Sound Controls
    masterVolume: document.getElementById('master-volume'),
    volBinaural: document.getElementById('vol-binaural'),
    volOcean: document.getElementById('vol-ocean'),
    volRain: document.getElementById('vol-rain'),
    volChimes: document.getElementById('vol-chimes'),
    volPad: document.getElementById('vol-pad'),
    toggleBinaural: document.getElementById('toggle-binaural'),
    toggleOcean: document.getElementById('toggle-ocean'),
    toggleRain: document.getElementById('toggle-rain'),
    toggleChimes: document.getElementById('toggle-chimes'),
    togglePad: document.getElementById('toggle-pad'),
    stopAllAudioBtn: document.getElementById('stop-all-audio'),

    // History and Dashboard
    historyLogsList: document.getElementById('history-logs-list'),
    analyticsChart: document.getElementById('analytics-chart'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    // Quote Element
    quoteContainer: document.getElementById('quote-container')
  };
}

function initializeUI() {
  // Render default messages
  renderChatMessages();
}

function setupEventListeners() {
  // Navigation
  elements.navChat.addEventListener('click', () => switchTab('chat'));
  elements.navExercises.addEventListener('click', () => switchTab('exercises'));
  elements.navSounds.addEventListener('click', () => switchTab('sounds'));
  elements.navHistory.addEventListener('click', () => switchTab('history'));

  // Chat Actions
  elements.chatSendBtn.addEventListener('click', handleChatSubmit);
  elements.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  });

  // Speech Recognition (Voice Companion)
  elements.chatMicBtn.addEventListener('click', toggleVoiceInput);

  // Breathing Exercises
  elements.btnStartBoxBreath.addEventListener('click', () => startBreathing('box'));
  elements.btnStartRelaxBreath.addEventListener('click', () => startBreathing('relax'));
  elements.btnStopBreath.addEventListener('click', stopBreathing);

  // Grounding Exercise
  elements.groundingSubmitBtn.addEventListener('click', handleGroundingInputSubmit);
  elements.groundingInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGroundingInputSubmit();
    }
  });

  // Gratitude Journal
  elements.gratitudeForm.addEventListener('submit', handleGratitudeSubmit);

  // Thought Reframer
  elements.reframerForm.addEventListener('submit', handleReframerSubmit);

  // Audio Mixer Controls
  elements.masterVolume.addEventListener('input', (e) => {
    initAudio();
    setMasterVolume(parseFloat(e.target.value));
  });
  
  // Mixer Sliders
  const setupVolumeSlider = (slider, key) => {
    slider.addEventListener('input', (e) => {
      initAudio();
      setSoundscapeVolume(key, parseFloat(e.target.value));
    });
  };
  setupVolumeSlider(elements.volBinaural, 'binaural');
  setupVolumeSlider(elements.volOcean, 'ocean');
  setupVolumeSlider(elements.volRain, 'rain');
  setupVolumeSlider(elements.volChimes, 'chimes');
  setupVolumeSlider(elements.volPad, 'pad');

  // Soundscape toggles
  const setupAudioToggle = (checkbox, key) => {
    checkbox.addEventListener('change', (e) => {
      initAudio();
      toggleSoundscape(key, e.target.checked);
      if (e.target.checked) {
        checkbox.closest('.mixer-card').classList.add('playing');
      } else {
        checkbox.closest('.mixer-card').classList.remove('playing');
      }
    });
  };
  setupAudioToggle(elements.toggleBinaural, 'binaural');
  setupAudioToggle(elements.toggleOcean, 'ocean');
  setupAudioToggle(elements.toggleRain, 'rain');
  setupAudioToggle(elements.toggleChimes, 'chimes');
  setupAudioToggle(elements.togglePad, 'pad');

  elements.stopAllAudioBtn.addEventListener('click', () => {
    stopAll();
    // Reset all checkboxes to unchecked state
    elements.toggleBinaural.checked = false;
    elements.toggleOcean.checked = false;
    elements.toggleRain.checked = false;
    elements.toggleChimes.checked = false;
    elements.togglePad.checked = false;
    
    document.querySelectorAll('.mixer-card').forEach(card => {
      card.classList.remove('playing');
    });
  });

  // History Clear
  elements.clearHistoryBtn.addEventListener('click', clearLogsHistory);
}

// ----------------------------------------------------
// Tab / UI Switching
// ----------------------------------------------------
function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Update nav buttons active classes
  const navBtns = [elements.navChat, elements.navExercises, elements.navSounds, elements.navHistory];
  navBtns.forEach(btn => btn.classList.remove('active'));
  
  // Update sections visible classes
  const tabPanels = [elements.tabChat, elements.tabExercises, elements.tabSounds, elements.tabHistory];
  tabPanels.forEach(panel => panel.classList.add('hidden'));

  if (tabId === 'chat') {
    elements.navChat.classList.add('active');
    elements.tabChat.classList.remove('hidden');
    elements.serenitySphere.style.display = 'block';
  } else if (tabId === 'exercises') {
    elements.navExercises.classList.add('active');
    elements.tabExercises.classList.remove('hidden');
    // Shrink Serenity or hide it to focus on breathing/journaling
    elements.serenitySphere.style.display = 'none';
  } else if (tabId === 'sounds') {
    elements.navSounds.classList.add('active');
    elements.tabSounds.classList.remove('hidden');
    elements.serenitySphere.style.display = 'block';
  } else if (tabId === 'history') {
    elements.navHistory.classList.add('active');
    elements.tabHistory.classList.remove('hidden');
    elements.serenitySphere.style.display = 'none';
    renderDashboard();
  }
}

// ----------------------------------------------------
// Serenity Mood Dynamics
// ----------------------------------------------------
function updateSerenityVisuals(emotion) {
  state.userEmotion = emotion;
  const theme = EMOTION_THEMES[emotion];
  
  // Set Custom CSS properties on document level or Serenity wrapper
  document.documentElement.style.setProperty('--serenity-color-1', theme.c1);
  document.documentElement.style.setProperty('--serenity-color-2', theme.c2);
  
  // Update pulse speed class
  elements.serenitySphere.style.animationDuration = theme.pulse;
  
  // Update serenity mood label
  elements.serenityMoodName.textContent = theme.label;
  elements.serenityMoodName.className = `mood-${emotion}`;
  
  // Subtle glowing drop shadows on panels based on mood color
  document.querySelectorAll('.glass-panel').forEach(panel => {
    panel.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.2), 0 0 16px ${theme.c1}`;
  });
}

// ----------------------------------------------------
// Chat & Voice Logic
// ----------------------------------------------------
function getFormattedTime() {
  const date = new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderChatMessages() {
  elements.chatMessages.innerHTML = '';
  state.chatHistory.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', msg.sender);
    
    // Add mood badge for user inputs
    let emotionBadge = '';
    if (msg.sender === 'user' && msg.emotion) {
      const emoji = getEmotionEmoji(msg.emotion);
      emotionBadge = `<span class="mood-badge badge-${msg.emotion}">${emoji} ${msg.emotion}</span>`;
    }

    msgDiv.innerHTML = `
      <div class="message-bubble">
        <p>${msg.text}</p>
        <div class="message-meta">
          ${emotionBadge}
          <span class="message-time">${msg.time}</span>
        </div>
      </div>
    `;
    elements.chatMessages.appendChild(msgDiv);
  });
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function getEmotionEmoji(emotion) {
  switch (emotion) {
    case 'joy': return '☀️';
    case 'sadness': return '🌧️';
    case 'anxiety': return '🌀';
    case 'anger': return '🔥';
    case 'calm': return '🍃';
    default: return '✨';
  }
}

function handleChatSubmit() {
  const text = elements.chatInput.value.trim();
  if (!text) return;
  
  // Clear input
  elements.chatInput.value = '';
  
  processUserMessage(text);
}

function processUserMessage(text) {
  // Push user message to history
  const time = getFormattedTime();
  
  // NLP analysis
  const analysis = classifyEmotion(text);
  
  state.chatHistory.push({
    sender: 'user',
    text: text,
    time: time,
    emotion: analysis.emotion,
    score: analysis.score
  });
  
  // Update Serenity
  updateSerenityVisuals(analysis.emotion);
  
  // Show bot typing indicator
  renderChatMessages();
  showBotTyping(analysis.response);
  
  // Save log
  saveMoodLog(text, analysis.emotion, analysis.score);
}

function showBotTyping(replyText) {
  const typingDiv = document.createElement('div');
  typingDiv.classList.add('chat-message', 'bot', 'typing');
  typingDiv.innerHTML = `
    <div class="message-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  elements.chatMessages.appendChild(typingDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  // Simulate natural delay
  setTimeout(() => {
    elements.chatMessages.removeChild(typingDiv);
    state.chatHistory.push({
      sender: 'bot',
      text: replyText,
      time: getFormattedTime()
    });
    renderChatMessages();
    suggestExercises(state.userEmotion);
  }, 1200);
}

function suggestExercises(emotion) {
  // If user is anxious, angry, or sad, show floating hints to guide them to exercises
  const tipsContainer = document.createElement('div');
  tipsContainer.classList.add('suggestion-card', `suggest-${emotion}`);
  
  let suggestionHTML = '';
  if (emotion === 'anxiety') {
    suggestionHTML = `
      <p>💡 <strong>Anxiety Detected:</strong> Racing mind? Let's anchor you with Box Breathing.</p>
      <button class="btn btn-sm btn-accent" onclick="document.getElementById('nav-exercises').click();">Start Breathing</button>
    `;
  } else if (emotion === 'anger') {
    suggestionHTML = `
      <p>💡 <strong>Tension Detected:</strong> Let's ground this intense energy with a 5-4-3-2-1 check.</p>
      <button class="btn btn-sm btn-accent" onclick="document.getElementById('nav-exercises').click();">Start Grounding</button>
    `;
  } else if (emotion === 'sadness') {
    suggestionHTML = `
      <p>💡 <strong>Sadness Detected:</strong> Let's release some thoughts in your Gratitude Journal.</p>
      <button class="btn btn-sm btn-accent" onclick="document.getElementById('nav-exercises').click();">Write in Journal</button>
    `;
  } else {
    return; // No suggestion needed for joy or calm
  }

  tipsContainer.innerHTML = suggestionHTML;
  elements.chatMessages.appendChild(tipsContainer);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  // Setup quick trigger
  const btn = tipsContainer.querySelector('button');
  if (btn) {
    btn.addEventListener('click', () => {
      switchTab('exercises');
      // Scroll to appropriate section
      if (emotion === 'anxiety') {
        document.getElementById('breathing-container').scrollIntoView({ behavior: 'smooth' });
      } else if (emotion === 'anger') {
        document.getElementById('grounding-container').scrollIntoView({ behavior: 'smooth' });
      } else if (emotion === 'sadness') {
        document.getElementById('gratitude-container').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// ----------------------------------------------------
// Voice Assistant (Speech Recognition)
// ----------------------------------------------------
function initSpeechRecognition() {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    elements.chatMicBtn.style.display = 'none'; // Not supported, hide button
    console.warn("Speech Recognition not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    state.speech.recognizing = true;
    elements.chatMicBtn.classList.add('recording');
    elements.chatInput.placeholder = "Listening attentively...";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.chatInput.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    stopSpeech();
  };

  recognition.onend = () => {
    stopSpeech();
    // Auto submit if text transcribed
    const text = elements.chatInput.value.trim();
    if (text) {
      elements.chatInput.value = '';
      processUserMessage(text);
    }
  };

  state.speech.recognition = recognition;
}

function toggleVoiceInput() {
  if (!state.speech.recognition) return;

  if (state.speech.recognizing) {
    state.speech.recognition.stop();
  } else {
    state.speech.recognition.start();
  }
}

function stopSpeech() {
  state.speech.recognizing = false;
  elements.chatMicBtn.classList.remove('recording');
  elements.chatInput.placeholder = "Talk about your feelings...";
}

// ----------------------------------------------------
// Guided Breathing Exercises
// ----------------------------------------------------
function startBreathing(mode) {
  stopBreathing(); // reset first
  
  state.breathing.cycleMode = mode;
  state.breathing.count = 0;
  elements.btnStartBoxBreath.disabled = true;
  elements.btnStartRelaxBreath.disabled = true;
  elements.btnStopBreath.classList.remove('hidden');
  elements.breathCircle.classList.add('active');

  runBreathingCycle();
}

function stopBreathing() {
  if (state.breathing.timer) clearInterval(state.breathing.timer);
  if (state.breathing.phaseTimer) clearTimeout(state.breathing.phaseTimer);
  
  state.breathing.phase = 'idle';
  elements.btnStartBoxBreath.disabled = false;
  elements.btnStartRelaxBreath.disabled = false;
  elements.btnStopBreath.classList.add('hidden');
  
  elements.breathCircle.classList.remove('active');
  elements.breathCircle.className = 'breath-circle'; // reset classes
  elements.breathCircle.style.transform = 'scale(1.0)';
  
  elements.breathTimerText.textContent = "Ready";
  elements.breathInstruction.textContent = "Choose a cycle to begin";
}

function runBreathingCycle() {
  const mode = state.breathing.cycleMode;
  
  // Define phases based on breathing method
  // Box Breathing: 4s Inhale -> 4s Hold -> 4s Exhale -> 4s Hold
  // 4-7-8 Breathing: 4s Inhale -> 7s Hold -> 8s Exhale -> (no Hold2)
  const phases = mode === 'box' 
    ? [
        { name: 'inhale', duration: 4, text: 'Breathe In...', scale: 1.8, color: '#4dd0e1' },
        { name: 'hold1', duration: 4, text: 'Hold...', scale: 1.8, color: '#ffb74d' },
        { name: 'exhale', duration: 4, text: 'Breathe Out...', scale: 1.0, color: '#81c784' },
        { name: 'hold2', duration: 4, text: 'Rest...', scale: 1.0, color: '#90a4ae' }
      ]
    : [
        { name: 'inhale', duration: 4, text: 'Breathe In...', scale: 1.8, color: '#4dd0e1' },
        { name: 'hold1', duration: 7, text: 'Hold Breath...', scale: 1.8, color: '#ffb74d' },
        { name: 'exhale', duration: 8, text: 'Breathe Out (Sigh)...', scale: 1.0, color: '#81c784' }
      ];

  let currentPhaseIdx = 0;

  const startPhase = () => {
    if (state.breathing.phase === 'idle') return;
    
    const phase = phases[currentPhaseIdx];
    state.breathing.phase = phase.name;
    state.breathing.secondsLeft = phase.duration;
    
    // Update Instructions & Scale SVG Circle
    elements.breathInstruction.textContent = phase.text;
    elements.breathCircle.style.transform = `scale(${phase.scale})`;
    elements.breathCircle.style.borderColor = phase.color;
    elements.breathCircle.style.boxShadow = `0 0 40px ${phase.color}`;
    
    // Play light tone cue if audio initialized
    playBreathingTone(phase.name);

    if (state.breathing.timer) clearInterval(state.breathing.timer);
    
    elements.breathTimerText.textContent = state.breathing.secondsLeft;
    
    state.breathing.timer = setInterval(() => {
      state.breathing.secondsLeft--;
      if (state.breathing.secondsLeft <= 0) {
        clearInterval(state.breathing.timer);
        // Go to next phase
        currentPhaseIdx = (currentPhaseIdx + 1) % phases.length;
        if (currentPhaseIdx === 0) {
          state.breathing.count++;
        }
        startPhase();
      } else {
        elements.breathTimerText.textContent = state.breathing.secondsLeft;
      }
    }, 1000);
  };

  state.breathing.phase = 'starting';
  startPhase();
}

function playBreathingTone(phase) {
  if (!audioCtx || audioCtx.state === 'suspended') return;
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.type = 'sine';
    
    // High-pitched soothing tone for transitions
    if (phase === 'inhale') {
      osc.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
      osc.frequency.linearRampToValueAtTime(329.63, audioCtx.currentTime + 0.3); // E4
    } else if (phase === 'hold1') {
      osc.frequency.setValueAtTime(392.00, audioCtx.currentTime); // G4
    } else if (phase === 'exhale') {
      osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
      osc.frequency.linearRampToValueAtTime(220.00, audioCtx.currentTime + 0.4); // A3
    } else {
      osc.frequency.setValueAtTime(220.00, audioCtx.currentTime); // A3
    }
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.7);
    
    setTimeout(() => {
      osc.disconnect();
      gainNode.disconnect();
    }, 800);
  } catch(e) {}
}

// ----------------------------------------------------
// Sensory Grounding Exercise (5-4-3-2-1)
// ----------------------------------------------------
function handleGroundingInputSubmit() {
  const text = elements.groundingInput.value.trim();
  if (!text) return;
  
  elements.groundingInput.value = '';
  
  const step = state.grounding.step;
  state.grounding.inputs[step].push(text);
  
  // Render input list item
  const li = document.createElement('li');
  li.textContent = `• ${text}`;
  elements.groundingList.appendChild(li);
  
  // Check if we met target for this step
  const targetCount = step; // 5 inputs for step 5, 4 for step 4, etc.
  const currentCount = state.grounding.inputs[step].length;
  
  // Progress Bar
  const percent = Math.min((currentCount / targetCount) * 100, 100);
  elements.groundingProgress.style.width = `${percent}%`;

  if (currentCount >= targetCount) {
    // Go to next step
    if (step > 1) {
      state.grounding.step = step - 1;
      setTimeout(transitionGroundingStep, 800);
    } else {
      // Completed the 5-4-3-2-1 exercise
      showGroundingCompletion();
    }
  } else {
    // Prompt for next item in same step
    elements.groundingInput.placeholder = `Item ${currentCount + 1} of ${targetCount}...`;
  }
}

function transitionGroundingStep() {
  const nextStep = state.grounding.step;
  elements.groundingList.innerHTML = '';
  elements.groundingProgress.style.width = '0%';
  
  const stepPrompts = {
    4: "Name 4 physical textures you can FEEL right now (e.g. keycaps, warm air, denim)",
    3: "Name 3 distinct sounds you can HEAR (e.g. computer hum, birds, ticking clock)",
    2: "Name 2 scents you can SMELL around you",
    1: "Name 1 thing you can TASTE (or recall tasting)"
  };

  elements.groundingPrompt.innerHTML = `🌟 Step ${nextStep}: <span class="step-guide">${stepPrompts[nextStep]}</span>`;
  elements.groundingInput.placeholder = `Item 1 of ${nextStep}...`;
}

function showGroundingCompletion() {
  elements.groundingSection.innerHTML = `
    <div class="completion-card">
      <h3>🌟 Grounding Complete!</h3>
      <p>You have successfully completed the 5-4-3-2-1 Sensory Grounding exercise. You have successfully rooted your mind back to the safety of the present moment.</p>
      <button class="btn btn-accent btn-sm" id="btn-reset-grounding">Repeat Exercise</button>
    </div>
  `;
  document.getElementById('btn-reset-grounding').addEventListener('click', resetGrounding);
  
  // Save completion record to LocalStorage
  saveActivityLog('grounding', 'Completed 5-4-3-2-1 sensory grounding check.');
}

function resetGrounding() {
  state.grounding.step = 5;
  state.grounding.inputs = { 5: [], 4: [], 3: [], 2: [], 1: [] };
  
  elements.groundingSection.innerHTML = `
    <h4 id="grounding-prompt">🌟 Step 5: <span class="step-guide">Name 5 things you can SEE around you.</span></h4>
    <div class="progress-bar-container">
      <div class="progress-bar" id="grounding-progress" style="width: 0%;"></div>
    </div>
    <ul id="grounding-list" class="grounding-items-list"></ul>
    <div class="grounding-input-row">
      <input type="text" id="grounding-input" placeholder="Item 1 of 5..." />
      <button id="grounding-submit-btn" class="btn btn-accent">Submit</button>
    </div>
  `;
  // Re-cache and bind
  elements.groundingPrompt = document.getElementById('grounding-prompt');
  elements.groundingInput = document.getElementById('grounding-input');
  elements.groundingSubmitBtn = document.getElementById('grounding-submit-btn');
  elements.groundingList = document.getElementById('grounding-list');
  elements.groundingProgress = document.getElementById('grounding-progress');
  
  elements.groundingSubmitBtn.addEventListener('click', handleGroundingInputSubmit);
  elements.groundingInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGroundingInputSubmit();
  });
}

// ----------------------------------------------------
// Gratitude Journal Submit
// ----------------------------------------------------
function handleGratitudeSubmit(e) {
  e.preventDefault();
  
  const g1 = elements.gratitudeInput1.value.trim();
  const g2 = elements.gratitudeInput2.value.trim();
  const g3 = elements.gratitudeInput3.value.trim();
  
  if (!g1 || !g2 || !g3) return;
  
  const entryText = `1. ${g1} | 2. ${g2} | 3. ${g3}`;
  saveActivityLog('gratitude', entryText);
  
  // Reset form
  elements.gratitudeForm.reset();
  
  // Show success effect
  showFloatingNotification("Gratitude Logged! ☀️ Sparkles added to your timeline.");
}

// ----------------------------------------------------
// Cognitive Thought Reframer Submit
// ----------------------------------------------------
function handleReframerSubmit(e) {
  e.preventDefault();
  
  const negative = elements.negativeThoughtInput.value.trim();
  const reframed = elements.reframedThoughtInput.value.trim();
  
  if (!negative || !reframed) return;
  
  const entryText = `Negative: "${negative}" ➡️ Reframed: "${reframed}"`;
  saveActivityLog('reframer', entryText);
  
  // Reset Form
  elements.reframerForm.reset();
  
  showFloatingNotification("Thought Reframed! 🍃 Feeling balanced.");
}

function showFloatingNotification(text) {
  const toast = document.createElement('div');
  toast.className = 'serenity-toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 3500);
}

// ----------------------------------------------------
// Persistence / Local Storage Logs
// ----------------------------------------------------
function saveMoodLog(text, emotion, score) {
  const logs = JSON.parse(localStorage.getItem('serenity_mood_logs') || '[]');
  logs.push({
    type: 'mood',
    timestamp: new Date().toISOString(),
    text: text,
    emotion: emotion,
    score: score
  });
  localStorage.setItem('serenity_mood_logs', JSON.stringify(logs));
}

function saveActivityLog(activityType, details) {
  const logs = JSON.parse(localStorage.getItem('serenity_mood_logs') || '[]');
  logs.push({
    type: 'activity',
    activity: activityType,
    timestamp: new Date().toISOString(),
    details: details
  });
  localStorage.setItem('serenity_mood_logs', JSON.stringify(logs));
}

function loadLogsHistory() {
  const logs = JSON.parse(localStorage.getItem('serenity_mood_logs') || '[]');
  elements.historyLogsList.innerHTML = '';
  
  if (logs.length === 0) {
    elements.historyLogsList.innerHTML = '<div class="no-logs">No emotional footprint recorded yet. Start talking to Serenity or complete some breathing loops.</div>';
    return;
  }
  
  // Sort logs: newest first
  const sortedLogs = [...logs].reverse();
  
  sortedLogs.forEach(log => {
    const dateObj = new Date(log.timestamp);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const item = document.createElement('div');
    item.className = 'history-item glass-card';
    
    if (log.type === 'mood') {
      const emoji = getEmotionEmoji(log.emotion);
      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-badge badge-${log.emotion}">${emoji} ${log.emotion.toUpperCase()}</span>
          <span class="history-time">${dateStr} • ${timeStr}</span>
        </div>
        <div class="history-body">
          <p>"${log.text}"</p>
        </div>
      `;
    } else if (log.type === 'activity') {
      const icon = log.activity === 'gratitude' ? '☀️' : (log.activity === 'reframer' ? '🍃' : '🌟');
      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-badge badge-activity">🧗 ${log.activity.toUpperCase()}</span>
          <span class="history-time">${dateStr} • ${timeStr}</span>
        </div>
        <div class="history-body">
          <p>${icon} ${log.details}</p>
        </div>
      `;
    }
    
    elements.historyLogsList.appendChild(item);
  });
}

function clearLogsHistory() {
  if (confirm("Are you sure you want to clear your entire emotional footprint history? This cannot be undone.")) {
    localStorage.removeItem('serenity_mood_logs');
    loadLogsHistory();
    renderDashboard();
    showFloatingNotification("Footprint History Cleared.");
  }
}

// ----------------------------------------------------
// Dashboard & Analytics (SVG Renderer)
// ----------------------------------------------------
function renderDashboard() {
  const logs = JSON.parse(localStorage.getItem('serenity_mood_logs') || '[]');
  
  // Count emotions
  const emotionCounts = { joy: 0, sadness: 0, anxiety: 0, anger: 0, calm: 0 };
  let totalMoods = 0;
  
  logs.forEach(log => {
    if (log.type === 'mood') {
      emotionCounts[log.emotion]++;
      totalMoods++;
    }
  });
  
  if (totalMoods === 0) {
    elements.analyticsChart.innerHTML = '<div class="no-chart">Insufficient data to chart. Type a few thoughts in the chat tab first.</div>';
    return;
  }
  
  // Render SVG Pie Chart / Bar Graph
  const width = 300;
  const height = 180;
  
  // Let's draw an elegant horizontal bar chart for emotions
  const maxCount = Math.max(...Object.values(emotionCounts), 1);
  const colors = {
    joy: '#ffd166',
    sadness: '#a29bfe',
    anxiety: '#81c784',
    anger: '#ff8a65',
    calm: '#4dd0e1'
  };

  let svgHTML = `<svg viewBox="0 0 ${width} ${height}" class="dashboard-svg">`;
  
  let y = 15;
  for (const emotion in emotionCounts) {
    const count = emotionCounts[emotion];
    const barWidth = totalMoods > 0 ? (count / maxCount) * 160 : 0;
    const pct = totalMoods > 0 ? Math.round((count / totalMoods) * 100) : 0;
    
    svgHTML += `
      <!-- Label -->
      <text x="10" y="${y + 12}" fill="rgba(255,255,255,0.8)" font-family="Inter, sans-serif" font-size="11" font-weight="600">${emotion.toUpperCase()}</text>
      <!-- Track Background -->
      <rect x="80" y="${y}" width="160" height="15" rx="3" fill="rgba(255,255,255,0.05)" />
      <!-- Active Bar -->
      <rect x="80" y="${y}" width="${barWidth}" height="15" rx="3" fill="${colors[emotion]}" />
      <!-- Percentage Text -->
      <text x="250" y="${y + 12}" fill="${colors[emotion]}" font-family="Inter, sans-serif" font-size="11" font-weight="700">${pct}% (${count})</text>
    `;
    y += 32;
  }
  
  svgHTML += `</svg>`;
  elements.analyticsChart.innerHTML = svgHTML;
}

// ----------------------------------------------------
// Quote of the Day
// ----------------------------------------------------
function renderQuote() {
  const quote = getMotivationalQuote();
  elements.quoteContainer.innerHTML = `
    <blockquote class="motivational-quote">
      <p>"${quote.text}"</p>
      <cite>— ${quote.author}</cite>
    </blockquote>
  `;
}
