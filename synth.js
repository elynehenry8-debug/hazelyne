// synth.js - Web Audio API Procedural Synthesizer for Relaxing Instrumentals

let audioCtx = null;
let masterGain = null;

// Soundscape states
const states = {
  binaural: { active: false, gain: null, node: null, volume: 0.5 },
  ocean: { active: false, gain: null, node: null, volume: 0.5, lfo: null },
  rain: { active: false, gain: null, node: null, volume: 0.5 },
  chimes: { active: false, gain: null, timer: null, volume: 0.5, delayNode: null },
  pad: { active: false, gain: null, timer: null, volume: 0.4, activeVoices: [], currentChordIdx: 0 }
};

// Wind chime pentatonic scale (A minor pentatonic)
const CHIME_PITCHES = [440.00, 493.88, 523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50];

// Ambient Pad chord progression: Fmaj9 -> Cmaj9 -> Am9 -> G6/11
const PAD_CHORDS = [
  [174.61, 220.00, 261.63, 329.63, 392.00], // F3, A3, C4, E4, G4 (Fmaj9)
  [130.81, 164.81, 196.00, 246.94, 293.66], // C3, E3, G3, B3, D4 (Cmaj9)
  [110.00, 146.83, 220.00, 261.63, 329.63], // A2, D3, A3, C4, E4 (Am9/no5)
  [196.00, 246.94, 293.66, 329.63, 392.00]  // G3, B3, D4, E4, G4 (G6/11)
];

/**
 * Initializes the AudioContext and master nodes
 */
export function initAudio() {
  if (audioCtx) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.8, audioCtx.currentTime); // default comfortable volume
  masterGain.connect(audioCtx.destination);

  // Initialize sub-gain nodes for each soundscape
  for (const key in states) {
    states[key].gain = audioCtx.createGain();
    states[key].gain.gain.setValueAtTime(0, audioCtx.currentTime); // Start at silence
    states[key].gain.connect(masterGain);
  }
}

/**
 * Ensures the Audio Context is running (helps bypass browser autoplay restrictions)
 */
async function resumeContext() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
}

/**
 * Sets master volume (0.0 to 1.0)
 */
export function setMasterVolume(value) {
  if (!masterGain) return;
  masterGain.gain.linearRampToValueAtTime(value, audioCtx.currentTime + 0.1);
}

/**
 * Adjusts volume of a specific soundscape
 */
export function setSoundscapeVolume(soundName, value) {
  if (!states[soundName]) return;
  states[soundName].volume = value;

  // If actively playing, adjust the gain node
  if (states[soundName].active && states[soundName].gain) {
    states[soundName].gain.gain.linearRampToValueAtTime(value, audioCtx.currentTime + 0.2);
  }
}

/**
 * Creates a looping audio buffer from custom samples generator
 */
function createNoiseBuffer(noiseType) {
  const sampleRate = audioCtx.sampleRate;
  const bufferSize = sampleRate * 2; // 2 seconds loop
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  if (noiseType === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (noiseType === 'pink') {
    // Voss-McCartney algorithm for Pink Noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // scale to reasonable amplitude
      b6 = white * 0.115926;
    }
  }

  return buffer;
}

/**
 * Toggles a soundscape on or off
 */
export async function toggleSoundscape(soundName, forceState = null) {
  await resumeContext();

  const state = states[soundName];
  const targetState = forceState !== null ? forceState : !state.active;

  if (targetState === state.active) return; // state already matched

  state.active = targetState;

  if (targetState) {
    // FADE IN
    startSoundSource(soundName);
    state.gain.gain.setValueAtTime(0, audioCtx.currentTime);
    state.gain.gain.linearRampToValueAtTime(state.volume, audioCtx.currentTime + 1.5); // 1.5s fade-in
  } else {
    // FADE OUT
    state.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5); // 1.5s fade-out
    setTimeout(() => {
      if (!state.active) { // check if still inactive
        stopSoundSource(soundName);
      }
    }, 1600);
  }
}

/**
 * Starts generating the synth source nodes
 */
function startSoundSource(soundName) {
  const state = states[soundName];

  if (soundName === 'binaural') {
    // Binaural Beats: Left channel plays 100Hz, Right plays 106Hz (6Hz Theta diff)
    const merger = audioCtx.createChannelMerger(2);

    const oscL = audioCtx.createOscillator();
    const oscR = audioCtx.createOscillator();

    oscL.type = 'sine';
    oscL.frequency.value = 100; // Left

    oscR.type = 'sine';
    oscR.frequency.value = 106; // Right

    // Connect oscillators to channels
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);

    // Route merger output to soundscape gain
    merger.connect(state.gain);

    oscL.start();
    oscR.start();

    state.node = { oscL, oscR, merger };

  } else if (soundName === 'ocean') {
    // Ocean: Pink noise source shaped by a low frequency oscillator (LFO)
    const noiseBuffer = createNoiseBuffer('pink');
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Lowpass filter to emulate deep rumble of water
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    // Dynamic volume controlled by LFO (Ocean swells every ~12 seconds)
    const waveGain = audioCtx.createGain();
    waveGain.gain.setValueAtTime(0.2, audioCtx.currentTime);

    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.08; // slow sweep (12.5 seconds cycle)

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.35; // sweep depth

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain); // Modulate wave volume

    source.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(state.gain);

    source.start();
    lfo.start();

    state.node = { source, filter, waveGain, lfo, lfoGain };

  } else if (soundName === 'rain') {
    // Rain: White noise filtered, with micro-amplitude modulation for rain pitter-patter
    const noiseBuffer = createNoiseBuffer('white');
    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800; // Higher frequency droplets
    filter.Q.value = 1.0;

    // Crackling envelope to simulate droplets
    const modulationGain = audioCtx.createGain();
    modulationGain.gain.setValueAtTime(0.4, audioCtx.currentTime);

    // Add LFO to modulate rain gusts
    const gustLfo = audioCtx.createOscillator();
    gustLfo.frequency.value = 0.15; // 6-7s cycles
    const gustGain = audioCtx.createGain();
    gustGain.gain.value = 0.15;

    gustLfo.connect(gustGain);
    gustGain.connect(modulationGain.gain);

    source.connect(filter);
    filter.connect(modulationGain);
    modulationGain.connect(state.gain);

    source.start();
    gustLfo.start();

    state.node = { source, filter, modulationGain, gustLfo };

  } else if (soundName === 'chimes') {
    // Wind Chimes: Create delay line for reverb space and trigger random chimes
    const delay = audioCtx.createDelay(2.0);
    const feedback = audioCtx.createGain();

    delay.delayTime.setValueAtTime(0.7, audioCtx.currentTime); // 700ms echo
    feedback.gain.setValueAtTime(0.4, audioCtx.currentTime); // 40% feedback

    // Feedback loop
    delay.connect(feedback);
    feedback.connect(delay);

    // Route directly to soundscape gain and also to delay
    delay.connect(state.gain);
    state.delayNode = { delay, feedback };

    // Scheduler loop for triggering chimes
    const triggerNextChime = () => {
      if (!state.active) return;

      playSingleChime();

      // Schedule next chime in 2 to 6 seconds randomly
      const delayMs = 2000 + Math.random() * 4000;
      state.timer = setTimeout(triggerNextChime, delayMs);
    };

    triggerNextChime();

  } else if (soundName === 'pad') {
    // Ambient Pad: Evolving chords with detuned oscillators
    state.currentChordIdx = 0;

    const playChordLoop = () => {
      if (!state.active) return;

      const chord = PAD_CHORDS[state.currentChordIdx];
      playPadChord(chord);

      // Rotate chord index
      state.currentChordIdx = (state.currentChordIdx + 1) % PAD_CHORDS.length;

      // Chords play every 8 seconds, overlapping
      state.timer = setTimeout(playChordLoop, 8000);
    };

    playChordLoop();
  }
}

/**
 * Stops generating the synth source nodes
 */
function stopSoundSource(soundName) {
  const state = states[soundName];

  if (soundName === 'binaural' && state.node) {
    state.node.oscL.stop();
    state.node.oscR.stop();
    state.node.oscL.disconnect();
    state.node.oscR.disconnect();
    state.node.merger.disconnect();
    state.node = null;
  } else if (soundName === 'ocean' && state.node) {
    state.node.source.stop();
    state.node.lfo.stop();
    state.node.source.disconnect();
    state.node.lfo.disconnect();
    state.node.waveGain.disconnect();
    state.node = null;
  } else if (soundName === 'rain' && state.node) {
    state.node.source.stop();
    state.node.gustLfo.stop();
    state.node.source.disconnect();
    state.node.gustLfo.disconnect();
    state.node.modulationGain.disconnect();
    state.node = null;
  } else if (soundName === 'chimes') {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.delayNode) {
      state.delayNode.delay.disconnect();
      state.delayNode.feedback.disconnect();
      state.delayNode = null;
    }
  } else if (soundName === 'pad') {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    // Fade out any active voices rapidly
    state.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
        setTimeout(() => {
          voice.osc1.stop();
          voice.osc2.stop();
          voice.osc1.disconnect();
          voice.osc2.disconnect();
          voice.gainNode.disconnect();
        }, 1100);
      } catch (e) { }
    });
    state.activeVoices = [];
  }
}

/**
 * Plays a single synthesized metal chime
 */
function playSingleChime() {
  if (!audioCtx || !states.chimes.gain) return;

  const pitch = CHIME_PITCHES[Math.floor(Math.random() * CHIME_PITCHES.length)];
  const chimeGain = audioCtx.createGain();

  // Quick strike, long ring out
  const now = audioCtx.currentTime;
  chimeGain.gain.setValueAtTime(0, now);
  chimeGain.gain.linearRampToValueAtTime(0.25, now + 0.005); // Strike
  chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5); // Decay

  // Metallic chime is composed of detuned harmonics
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const osc3 = audioCtx.createOscillator();

  osc1.type = 'triangle';
  osc1.frequency.value = pitch;

  osc2.type = 'sine';
  osc2.frequency.value = pitch * 1.5; // detuned overtone (fifth)

  osc3.type = 'sine';
  osc3.frequency.value = pitch * 2.15; // dissonant overtone for metal chime sound

  // Route oscillators to chime envelope
  osc1.connect(chimeGain);
  osc2.connect(chimeGain);
  osc3.connect(chimeGain);

  // Route envelope to main chimes channel and to delay node
  chimeGain.connect(states.chimes.gain);
  if (states.chimes.delayNode) {
    chimeGain.connect(states.chimes.delayNode.delay);
  }

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);

  // Stop and clean up nodes after chime finishes decay
  osc1.stop(now + 4.0);
  osc2.stop(now + 4.0);
  osc3.stop(now + 4.0);

  setTimeout(() => {
    osc1.disconnect();
    osc2.disconnect();
    osc3.disconnect();
    chimeGain.disconnect();
  }, 4500);
}

/**
 * Synthesizes a set of notes playing together as a warm pad chord
 */
function playPadChord(frequencies) {
  if (!audioCtx || !states.pad.gain) return;

  const now = audioCtx.currentTime;
  const chordDuration = 9.0; // 9s chord duration (1s overlap)

  // Create an array to track this chord's oscillators
  const chordVoices = [];

  // Create a filter specifically for this chord to allow filter sweeps
  const filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(320, now);
  filterNode.frequency.exponentialRampToValueAtTime(700, now + 4.0); // Sweep up
  filterNode.frequency.exponentialRampToValueAtTime(280, now + 8.5); // Sweep down
  filterNode.Q.value = 1.2;

  filterNode.connect(states.pad.gain);

  frequencies.forEach((freq) => {
    const voiceGain = audioCtx.createGain();
    // Warm slow attack, slow decay
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(0.08, now + 3.0); // 3s attack fade-in
    voiceGain.gain.setValueAtTime(0.08, now + 5.5);
    voiceGain.gain.linearRampToValueAtTime(0, now + chordDuration); // 3.5s release fade-out

    // Each voice consists of two detuned oscillators (warm chorusing)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();

    osc1.type = 'triangle';
    osc1.frequency.value = freq - 0.4; // Detune down

    osc2.type = 'triangle';
    osc2.frequency.value = freq + 0.4; // Detune up

    osc1.connect(voiceGain);
    osc2.connect(voiceGain);
    voiceGain.connect(filterNode);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + chordDuration + 0.2);
    osc2.stop(now + chordDuration + 0.2);

    const voiceData = { osc1, osc2, gainNode: voiceGain };
    chordVoices.push(voiceData);
    states.pad.activeVoices.push(voiceData);
  });

  // Schedule voice array cleanup from active list
  setTimeout(() => {
    states.pad.activeVoices = states.pad.activeVoices.filter(v => !chordVoices.includes(v));
    chordVoices.forEach(voice => {
      voice.osc1.disconnect();
      voice.osc2.disconnect();
      voice.gainNode.disconnect();
    });
    filterNode.disconnect();
  }, chordDuration * 1000 + 500);
}

/**
 * Fades out all soundscapes and stops the audio engine
 */
export function stopAll() {
  for (const key in states) {
    if (states[key].active) {
      toggleSoundscape(key, false);
    }
  }
}
