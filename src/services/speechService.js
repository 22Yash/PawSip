import { getSetting } from './storageService';

/**
 * Speech Message Collections
 * Exact prompt-specified phrases randomized for bubble text & speech.
 */
export const MESSAGE_COLLECTIONS = {
  greeting: [
    "Hey {name}! It's water time!",
    "Psst! Don't forget your water!",
    "Woof woof! Let's take a little sip!"
  ],
  happy: [
    "Yay! Good human. Stay hydrated!",
    "I'm so proud of you!",
    "Another healthy choice!"
  ],
  angry: [
    "Grrr! Your body needs water. I'll be back!",
    "Hmph! Drink some water, please!"
  ],
  sad: [
    "Okay... I'll wait for you.",
    "Your water is waiting!"
  ]
};

/**
 * Returns a randomized message from the given category with {name} substituted
 * @param {'greeting'|'happy'|'angry'|'sad'} category
 * @param {string} name
 * @returns {string}
 */
export function getRandomMessage(category, name = 'Friend') {
  const collection = MESSAGE_COLLECTIONS[category] || MESSAGE_COLLECTIONS.greeting;
  const template = collection[Math.floor(Math.random() * collection.length)];
  const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : 'Friend';
  return template.replace('{name}', cleanName);
}

// Global state for SpeechSynthesis
let cachedVoices = [];
let voicesPromise = null;
let activeUtterance = null;
let activeSpeakingCallback = null;

/**
 * Cancel any ongoing speech and notify listeners
 */
export function cancelSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('[speechService] Error cancelling speech:', err);
    }
  }

  if (activeSpeakingCallback) {
    try {
      activeSpeakingCallback(false);
    } catch {}
    activeSpeakingCallback = null;
  }

  activeUtterance = null;
}

// Clean up speech when window is refreshed or closed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cancelSpeech);
}

/**
 * Loads and returns all available SpeechSynthesis voices, waiting for
 * the 'voiceschanged' event if the initial list is empty.
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function getAvailableVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing && existing.length > 0) {
    cachedVoices = existing;
    return Promise.resolve(existing);
  }

  if (voicesPromise) {
    return voicesPromise;
  }

  voicesPromise = new Promise((resolve) => {
    let settled = false;

    const finish = (voices) => {
      if (settled) return;
      settled = true;
      cachedVoices = voices || [];
      voicesPromise = null;
      resolve(cachedVoices);
    };

    const onVoicesChanged = () => {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        finish(list);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    // Safety fallback timer if voiceschanged doesn't fire
    setTimeout(() => {
      const list = window.speechSynthesis.getVoices();
      finish(list);
    }, 600);
  });

  return voicesPromise;
}

/**
 * Select the best voice:
 * 1. User-preferred voice by name (if configured and installed)
 * 2. Preferred female English voice (e.g. Zira, Aria, Jenny, Samantha, Victoria, en-US / en-IN / en-GB)
 * 3. Any English voice
 * 4. Default system voice
 * 5. First available voice
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} [preferredName]
 * @returns {SpeechSynthesisVoice|null}
 */
export function selectBestVoice(voices, preferredName = '') {
  if (!voices || voices.length === 0) return null;

  // 1. Explicit preferred name
  if (preferredName) {
    const matched = voices.find((v) => v.name === preferredName);
    if (matched) return matched;
  }

  // 2. Preferred female English voice (e.g. "Microsoft Zira", "Microsoft Aria", "Jenny", "Samantha")
  const femaleKeywords = ['zira', 'aria', 'jenny', 'samantha', 'victoria', 'karen', 'female', 'natural'];
  const femaleEnglish = voices.find((v) => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const isEn = lang.startsWith('en');
    const isFemale = femaleKeywords.some((kw) => name.includes(kw));
    return isEn && isFemale;
  });
  if (femaleEnglish) return femaleEnglish;

  // 3. Any English voice (e.g. en-US, en-IN, en-GB, en-AU)
  const anyEnglish = voices.find((v) => (v.lang || '').toLowerCase().startsWith('en'));
  if (anyEnglish) return anyEnglish;

  // 4. Default voice
  const defaultVoice = voices.find((v) => v.default);
  if (defaultVoice) return defaultVoice;

  // 5. Fallback to first
  return voices[0] || null;
}

/**
 * Speaks text using the browser SpeechSynthesis API.
 *
 * @param {string} text - Message to speak
 * @param {object} [options]
 * @param {boolean} [options.force=false] - Speak even if voiceEnabled setting is false (e.g. Test Voice)
 * @param {string} [options.voiceName] - Custom voice override
 * @param {number} [options.pitch] - Pitch override (cute default ~1.3)
 * @param {number} [options.rate] - Rate override (gentle default ~0.95)
 * @param {number} [options.safetyTimeoutMs=6000] - Safety timeout in ms before resolving
 * @param {(isSpeaking: boolean) => void} [options.onSpeakingChange] - Syncs mouth state
 * @returns {Promise<boolean>} Resolves when speech completes or safety timeout reached
 */
export async function speak(text, options = {}) {
  const {
    force = false,
    voiceName = null,
    pitch = null,
    rate = null,
    safetyTimeoutMs = 6000,
    onSpeakingChange = null
  } = options;

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
    onSpeakingChange?.(false);
    return false;
  }

  // Check voiceEnabled setting unless forced
  if (!force) {
    try {
      const enabled = await getSetting('voiceEnabled');
      if (enabled === false) {
        onSpeakingChange?.(false);
        return false;
      }
    } catch (err) {
      console.warn('[speechService] Error checking voiceEnabled:', err);
    }
  }

  // Never overlap: always cancel previous speech first
  cancelSpeech();

  // Load configured settings from electron-store
  let chosenPitch = 1.3;
  let chosenRate = 0.95;
  let chosenVoiceName = '';

  try {
    const [storedPitch, storedRate, storedVoiceName] = await Promise.all([
      getSetting('voicePitch'),
      getSetting('voiceRate'),
      getSetting('voiceName')
    ]);
    if (typeof storedPitch === 'number') chosenPitch = storedPitch;
    if (typeof storedRate === 'number') chosenRate = storedRate;
    if (typeof storedVoiceName === 'string') chosenVoiceName = storedVoiceName;
  } catch {}

  if (typeof pitch === 'number') chosenPitch = pitch;
  if (typeof rate === 'number') chosenRate = rate;
  if (typeof voiceName === 'string') chosenVoiceName = voiceName;

  // Clean emojis out of spoken text for smooth system pronunciation
  const speakableText = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim() || text;

  const voices = await getAvailableVoices();
  const selectedVoice = selectBestVoice(voices, chosenVoiceName);

  return new Promise((resolve) => {
    let isDone = false;
    let timer = null;

    const finalize = (success = true) => {
      if (isDone) return;
      isDone = true;
      if (timer) clearTimeout(timer);
      if (activeSpeakingCallback) {
        try {
          activeSpeakingCallback(false);
        } catch {}
        activeSpeakingCallback = null;
      }
      activeUtterance = null;
      resolve(success);
    };

    activeSpeakingCallback = onSpeakingChange;

    const utterance = new SpeechSynthesisUtterance(speakableText);
    utterance.pitch = Math.max(0.5, Math.min(2.0, chosenPitch));
    utterance.rate = Math.max(0.5, Math.min(2.0, chosenRate));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      onSpeakingChange?.(true);
    };

    utterance.onend = () => {
      finalize(true);
    };

    utterance.onerror = (e) => {
      finalize(false);
    };

    // Keep active reference to prevent Chromium garbage collection bug
    activeUtterance = utterance;

    // Safety timeout so callers awaiting completion never hang indefinitely
    timer = setTimeout(() => {
      finalize(false);
    }, safetyTimeoutMs);

    try {
      window.speechSynthesis.speak(utterance);
      // Kickstart Chromium speech synthesis if paused/suspended
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.warn('[speechService] Failed to speak utterance:', err);
      finalize(false);
    }
  });
}
