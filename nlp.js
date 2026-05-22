// nlp.js - Emotion and Sentiment Classifier for Mental Wellness Companion

// Dictionaries mapping emotional keywords to base valence weights
const EMOTION_DICTIONARY = {
  // Joy & Gratitude
  happy: { emotion: 'joy', weight: 1.0 },
  joy: { emotion: 'joy', weight: 1.2 },
  joyful: { emotion: 'joy', weight: 1.2 },
  glad: { emotion: 'joy', weight: 0.8 },
  content: { emotion: 'joy', weight: 0.7 },
  excited: { emotion: 'joy', weight: 1.1 },
  delighted: { emotion: 'joy', weight: 1.1 },
  thrilled: { emotion: 'joy', weight: 1.2 },
  grateful: { emotion: 'joy', weight: 1.2 },
  thankful: { emotion: 'joy', weight: 1.0 },
  blessed: { emotion: 'joy', weight: 1.0 },
  positive: { emotion: 'joy', weight: 0.8 },
  wonderful: { emotion: 'joy', weight: 1.1 },
  amazing: { emotion: 'joy', weight: 1.2 },
  great: { emotion: 'joy', weight: 0.9 },
  good: { emotion: 'joy', weight: 0.6 },
  love: { emotion: 'joy', weight: 1.1 },
  fantastic: { emotion: 'joy', weight: 1.2 },
  optimistic: { emotion: 'joy', weight: 0.9 },
  proud: { emotion: 'joy', weight: 0.8 },
  satisfied: { emotion: 'joy', weight: 0.7 },
  smile: { emotion: 'joy', weight: 0.8 },
  smiling: { emotion: 'joy', weight: 0.8 },
  laugh: { emotion: 'joy', weight: 0.9 },
  laughing: { emotion: 'joy', weight: 0.9 },
  cheerful: { emotion: 'joy', weight: 1.0 },
  hopeful: { emotion: 'joy', weight: 0.9 },
  peace: { emotion: 'joy', weight: 0.8 }, // overlaps with calm, but represents positive state

  // Sadness & Grief
  sad: { emotion: 'sadness', weight: 1.0 },
  sadness: { emotion: 'sadness', weight: 1.1 },
  depressed: { emotion: 'sadness', weight: 1.2 },
  depression: { emotion: 'sadness', weight: 1.2 },
  lonely: { emotion: 'sadness', weight: 1.1 },
  loneliness: { emotion: 'sadness', weight: 1.1 },
  down: { emotion: 'sadness', weight: 0.7 },
  low: { emotion: 'sadness', weight: 0.6 },
  crying: { emotion: 'sadness', weight: 1.1 },
  cry: { emotion: 'sadness', weight: 1.0 },
  weep: { emotion: 'sadness', weight: 1.1 },
  blue: { emotion: 'sadness', weight: 0.6 },
  empty: { emotion: 'sadness', weight: 0.9 },
  hopeless: { emotion: 'sadness', weight: 1.2 },
  grief: { emotion: 'sadness', weight: 1.1 },
  grieve: { emotion: 'sadness', weight: 1.1 },
  grieving: { emotion: 'sadness', weight: 1.1 },
  heartbroken: { emotion: 'sadness', weight: 1.3 },
  miserable: { emotion: 'sadness', weight: 1.2 },
  unhappy: { emotion: 'sadness', weight: 0.9 },
  hurt: { emotion: 'sadness', weight: 0.8 },
  sorrow: { emotion: 'sadness', weight: 1.1 },
  pain: { emotion: 'sadness', weight: 0.8 },
  heavy: { emotion: 'sadness', weight: 0.5 },
  lost: { emotion: 'sadness', weight: 0.8 },
  disappointed: { emotion: 'sadness', weight: 0.8 },
  disappointment: { emotion: 'sadness', weight: 0.8 },
  griefstrike: { emotion: 'sadness', weight: 1.2 },
  alone: { emotion: 'sadness', weight: 0.7 },

  // Anxiety, Stress & Fear
  anxious: { emotion: 'anxiety', weight: 1.0 },
  anxiety: { emotion: 'anxiety', weight: 1.2 },
  worried: { emotion: 'anxiety', weight: 0.9 },
  worry: { emotion: 'anxiety', weight: 0.8 },
  worrying: { emotion: 'anxiety', weight: 0.9 },
  stressed: { emotion: 'anxiety', weight: 1.0 },
  stress: { emotion: 'anxiety', weight: 0.9 },
  stressful: { emotion: 'anxiety', weight: 1.0 },
  overwhelmed: { emotion: 'anxiety', weight: 1.2 },
  overwhelming: { emotion: 'anxiety', weight: 1.1 },
  nervous: { emotion: 'anxiety', weight: 0.8 },
  panic: { emotion: 'anxiety', weight: 1.3 },
  panicking: { emotion: 'anxiety', weight: 1.3 },
  scared: { emotion: 'anxiety', weight: 1.0 },
  afraid: { emotion: 'anxiety', weight: 0.9 },
  fear: { emotion: 'anxiety', weight: 1.0 },
  fearful: { emotion: 'anxiety', weight: 1.0 },
  terrified: { emotion: 'anxiety', weight: 1.2 },
  uneasy: { emotion: 'anxiety', weight: 0.7 },
  tense: { emotion: 'anxiety', weight: 0.8 },
  hyper: { emotion: 'anxiety', weight: 0.6 },
  shaking: { emotion: 'anxiety', weight: 0.8 },
  heartbeat: { emotion: 'anxiety', weight: 0.7 },
  chest: { emotion: 'anxiety', weight: 0.5 }, // context sensitive
  pressure: { emotion: 'anxiety', weight: 0.6 },
  restless: { emotion: 'anxiety', weight: 0.8 },
  dread: { emotion: 'anxiety', weight: 1.1 },
  scare: { emotion: 'anxiety', weight: 0.8 },
  shaky: { emotion: 'anxiety', weight: 0.8 },
  unsettled: { emotion: 'anxiety', weight: 0.7 },

  // Anger & Frustration
  angry: { emotion: 'anger', weight: 1.0 },
  anger: { emotion: 'anger', weight: 1.1 },
  mad: { emotion: 'anger', weight: 1.0 },
  annoyed: { emotion: 'anger', weight: 0.8 },
  annoying: { emotion: 'anger', weight: 0.8 },
  frustrated: { emotion: 'anger', weight: 0.9 },
  frustration: { emotion: 'anger', weight: 1.0 },
  pissed: { emotion: 'anger', weight: 1.2 },
  furious: { emotion: 'anger', weight: 1.2 },
  irritated: { emotion: 'anger', weight: 0.8 },
  irritation: { emotion: 'anger', weight: 0.8 },
  hate: { emotion: 'anger', weight: 1.1 },
  hated: { emotion: 'anger', weight: 1.1 },
  resentment: { emotion: 'anger', weight: 1.0 },
  resentful: { emotion: 'anger', weight: 0.9 },
  bitter: { emotion: 'anger', weight: 0.7 },
  rage: { emotion: 'anger', weight: 1.2 },
  fury: { emotion: 'anger', weight: 1.2 },
  snap: { emotion: 'anger', weight: 0.7 },
  snapped: { emotion: 'anger', weight: 0.8 },
  screaming: { emotion: 'anger', weight: 0.9 },
  scream: { emotion: 'anger', weight: 0.8 },
  disgusted: { emotion: 'anger', weight: 0.9 },
  hostile: { emotion: 'anger', weight: 1.0 },

  // Calm & Relaxation
  calm: { emotion: 'calm', weight: 1.0 },
  calmer: { emotion: 'calm', weight: 1.0 },
  relaxed: { emotion: 'calm', weight: 1.0 },
  relax: { emotion: 'calm', weight: 0.9 },
  relaxing: { emotion: 'calm', weight: 0.9 },
  peaceful: { emotion: 'calm', weight: 1.0 },
  serene: { emotion: 'calm', weight: 1.1 },
  tranquil: { emotion: 'calm', weight: 1.1 },
  chill: { emotion: 'calm', weight: 0.7 },
  chilled: { emotion: 'calm', weight: 0.7 },
  steady: { emotion: 'calm', weight: 0.8 },
  balanced: { emotion: 'calm', weight: 0.9 },
  restful: { emotion: 'calm', weight: 0.8 },
  soothed: { emotion: 'calm', weight: 0.9 },
  soothing: { emotion: 'calm', weight: 0.8 },
  quiet: { emotion: 'calm', weight: 0.6 },
  still: { emotion: 'calm', weight: 0.5 },
  comfortable: { emotion: 'calm', weight: 0.7 }
};

// Intensifiers multiply emotional weight
const INTENSIFIERS = {
  very: 1.5,
  extremely: 2.0,
  so: 1.3,
  super: 1.4,
  highly: 1.5,
  really: 1.3,
  incredibly: 1.8,
  deeply: 1.6,
  quite: 1.2,
  totally: 1.4,
  completely: 1.5,
  absolutely: 1.6,
  lot: 1.3,
  much: 1.2,
  terribly: 1.5,
  dreadfully: 1.6,
  awfully: 1.4
};

// Diminishers reduce emotional weight
const DIMINISHERS = {
  slightly: 0.6,
  bit: 0.7,
  little: 0.7,
  somewhat: 0.8,
  barely: 0.4,
  hardly: 0.4,
  kind: 0.8,
  sort: 0.8
};

// Negations invert or redirect the emotion
const NEGATIONS = [
  'not', 'no', 'never', 'dont', 'cant', 'wasnt', 'isnt', 'havent', 
  'wont', 'shouldnt', 'wouldnt', 'cannot', 'neither', 'nor', 'without'
];

// Empathetic companion responses mapping to primary emotions
const COMPANION_RESPONSES = {
  joy: [
    "It warms my heart to hear that you are feeling joyful! Gratitude and joy are beautiful states to be in. Let's celebrate this positive energy! Would you like to log this moment in your Gratitude Journal to anchor this feeling?",
    "That is wonderful news! Experiencing happiness builds emotional resilience. Take a moment to fully absorb this good feeling. What is one specific thing that made you smile today?",
    "I'm smiling reading this! It sounds like you have a wonderful spark of positive energy right now. Keep shining! Would you like to share a detail in your diary or set a positive intention for the rest of the day?"
  ],
  sadness: [
    "I hear you, and I want you to know it is completely okay to feel sad or down. Crying or feeling low is a natural way our hearts process events. Please be gentle with yourself today. Would you like to sit with some relaxing instrumental chimes, or write about what's on your mind?",
    "I'm so sorry you're feeling this weight. Please remember that you don't have to carry it all at once. Just taking it one minute at a time is enough. Let's try some light, comforting ambient music or a gentle reflection prompt.",
    "It sounds like things feel heavy right now, and that's a very valid feeling. You are not alone, and there is no rush to feel better. Let's take a slow breath together. Would you like to try a reflective prompt to express these thoughts?"
  ],
  anxiety: [
    "It sounds like everything is feeling incredibly overwhelming or fast-paced right now. Let's take a pause. We can slow things down together. Can we do a quick, calming 4-7-8 breathing exercise? I'll guide you step-by-step.",
    "I can sense the tension or worry in your words. When the mind races, anchoring ourselves in the body can bring relief. Let's try the 5-4-3-2-1 Sensory Grounding exercise to gently pull you back into the present moment. I'm right here with you.",
    "Breathe. It is okay if you feel anxious right now; it is just your nervous system trying to protect you. You are safe here. Let's turn on the 'Ocean Waves' soundscape and do a box-breathing session to steady your pulse. Shall we start?"
  ],
  anger: [
    "I hear how frustrating and aggravating this is, and your anger is completely valid. Anger is just a strong signal that a boundary was crossed or something feels unfair. Let's channel that intense energy safely. Would you like to try a grounding exercise, or write out a raw, unfiltered thought stream in the reframer?",
    "It sounds like you are feeling really heated or irritated. It is completely natural to feel this way. Let's take a slow, deep breath to cool the physical fire in the body. If you'd like, we can turn on some ambient wind chimes to clear the air, and work through this together.",
    "I hear the passion and frustration in your voice. Let's give that anger some space to settle without judgment. Try listing what triggered you, or let's use the 'Thought Reframer' to examine how we can process this tension."
  ],
  calm: [
    "What a peaceful state to be in. Experiencing calmness is a gift to your nervous system. Let's maintain this beautiful equilibrium. Would you like to listen to the cosmic resonance chords, or simply rest in this quiet space?",
    "It sounds like you are feeling centered and steady. Maintaining this calm is a wonderful way to recharge. You might enjoy reading our daily motivational quote or spending a few moments in a peaceful breathing flow.",
    "I feel a gentle, quiet presence in your words. It's beautiful to pause and enjoy this neutral, calm state. Let's keep this soothing momentum going with some soft forest rain sounds."
  ]
};

// Default fallback quotes / prompts
const MOTIVATIONAL_QUOTES = [
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Quiet the mind and the soul will speak.", author: "Ma Jaya Sati Bhagavati" },
  { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
  { text: "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.", author: "Thich Nhat Hanh" },
  { text: "The primary cause of unhappiness is never the situation but your thoughts about it.", author: "Eckhart Tolle" },
  { text: "Amor Fati - Love your fate, which is in fact your life.", author: "Nietzsche" },
  { text: "Deep breaths are like little love notes to your body.", author: "Unknown" },
  { text: "You are, at this moment, standing, right in the middle of your own 'happy, healthy, meaningful' life, if you choose to see it.", author: "Unknown" }
];

/**
 * Text Preprocessing: normalizes case, removes punctuation except apostrophes, replaces negative contractions
 */
function preprocessText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/can't/g, 'cant')
    .replace(/don't/g, 'dont')
    .replace(/wasn't/g, 'wasnt')
    .replace(/isn't/g, 'isnt')
    .replace(/haven't/g, 'havent')
    .replace(/won't/g, 'wont')
    .replace(/shouldn't/g, 'shouldnt')
    .replace(/wouldn't/g, 'wouldnt')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifies emotional tone of a given text.
 * Evaluates words for match in dictionary, factoring in intensifiers, diminishers, and negations.
 */
export function classifyEmotion(text) {
  const cleanText = preprocessText(text);
  const words = cleanText.split(' ');

  const scores = {
    joy: 0.0,
    sadness: 0.0,
    anxiety: 0.0,
    anger: 0.0,
    calm: 0.0
  };

  let modifier = 1.0;
  let negated = false;
  let matchesCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Check for negations within context windows
    if (NEGATIONS.includes(word)) {
      negated = true;
      continue;
    }

    // Check for intensifiers
    if (INTENSIFIERS[word]) {
      modifier = INTENSIFIERS[word];
      continue;
    }

    // Check for diminishers
    if (DIMINISHERS[word]) {
      modifier = DIMINISHERS[word];
      continue;
    }

    // Check dictionary match
    if (EMOTION_DICTIONARY[word]) {
      const entry = EMOTION_DICTIONARY[word];
      let emotionalScore = entry.weight * modifier;
      let targetEmotion = entry.emotion;

      // Handle Negation Logic:
      // If negated, we map the emotion to its logical opposite/alternative
      if (negated) {
        emotionalScore *= 0.8; // slightly dampen negated scores
        if (targetEmotion === 'joy') {
          targetEmotion = 'sadness';
        } else if (targetEmotion === 'sadness') {
          targetEmotion = 'calm';
        } else if (targetEmotion === 'anxiety') {
          targetEmotion = 'calm';
        } else if (targetEmotion === 'anger') {
          targetEmotion = 'calm';
        } else if (targetEmotion === 'calm') {
          targetEmotion = 'anxiety'; // not calm -> anxious/irritated
        }
      }

      scores[targetEmotion] += emotionalScore;
      matchesCount++;

      // Reset modifiers for the next clause
      modifier = 1.0;
      negated = false;
    }
  }

  // Determine primary emotion
  let primaryEmotion = 'calm'; // Default state is calm/neutral
  let highestScore = 0;

  for (const emotion in scores) {
    if (scores[emotion] > highestScore) {
      highestScore = scores[emotion];
      primaryEmotion = emotion;
    }
  }

  // If no matching emotion words were found, we do a fallback evaluation
  if (matchesCount === 0 || highestScore === 0) {
    primaryEmotion = 'calm';
    scores.calm = 0.5;
  }

  // Normalize scores into a sum-to-one probability distribution (softmax style or simple division)
  const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
  const normalizedScores = {};
  for (const emotion in scores) {
    normalizedScores[emotion] = totalScore > 0 ? scores[emotion] / totalScore : (emotion === 'calm' ? 1.0 : 0.0);
  }

  // Select a random empathetic response matching the primary emotion
  const responseOptions = COMPANION_RESPONSES[primaryEmotion];
  const responseIdx = Math.floor(Math.random() * responseOptions.length);
  const response = responseOptions[responseIdx];

  return {
    emotion: primaryEmotion,
    score: normalizedScores[primaryEmotion],
    scores: normalizedScores,
    response: response
  };
}

/**
 * Gets a random motivational quote
 */
export function getMotivationalQuote() {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[idx];
}
