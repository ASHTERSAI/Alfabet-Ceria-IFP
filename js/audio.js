/* ==========================================================================
   SISTEM AUDIO HYBRID (ONLINE GITHUB PAGES + OFFLINE APK + EDITABLE GURU)
   1. Rekaman / Unggahan Suara Guru di Studio Suara (IndexedDB)
   2. File Audio Statis di folder assets/audio/{huruf}.mp3 (jika dibundel ke APK/GitHub)
   3. AndroidBridge Native TTS (otomatis aktif saat dibungkus APK Android)
   4. Suara Wanita Bahasa Indonesia Real:
      - Web Speech API suara Bahasa Indonesia (Google Bahasa Indonesia / Gadis / Damayanti)
      - Online TTS Wanita Indonesia (saat online di GitHub/Browser jika perangkat belum punya paket id-ID)
      - Offline Web Speech API lang='id-ID' (dijamin TIDAK PERNAH BISU!)
   ========================================================================== */
window.AlfabetAudio = (function () {
  let soundEnabled = true;
  let bgmEnabled = true;
  let audioMode = localStorage.getItem('alfabet_audio_mode') || 'auto'; // 'auto' | 'online' | 'offline'

  let audioCtx = null;
  let bgmTimer = null;
  let bgmIndex = 0;
  let isSpeakingNow = false;

  let idVoicesList = [];
  let selectedIdVoice = null;
  let preferredVoiceURI = localStorage.getItem('alfabet_id_voice_uri') || '';
  let onVoiceReadyCallback = null;
  let currentHtmlAudio = null;
  let speakDelayTimer = null;

  const customVoices = {};
  const missingStaticAudio = new Set();
  const DB_NAME = 'AlfabetCeriaVoiceDB_v2';
  const STORE_NAME = 'teacherVoices';

  const BGM_MELODY = [
    523.25, 587.33, 659.25, 523.25,
    659.25, 783.99, 880.00, 783.99,
    880.00, 783.99, 659.25, 587.33,
    523.25, 392.00, 523.25, 0
  ];

  function openVoiceDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject('No IndexedDB');
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e);
    });
  }

  function loadAllCustomVoices() {
    openVoiceDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = cursor.key;
          const blob = cursor.value;
          if (blob instanceof Blob) {
            if (customVoices[key] && customVoices[key].url) {
              URL.revokeObjectURL(customVoices[key].url);
            }
            customVoices[key] = { blob, url: URL.createObjectURL(blob) };
          }
          cursor.continue();
        } else {
          notifyVoiceStatus();
        }
      };
    }).catch(() => {});
  }

  function saveCustomVoice(letterKey, blob) {
    const key = letterKey.toUpperCase();
    if (customVoices[key] && customVoices[key].url) {
      URL.revokeObjectURL(customVoices[key].url);
    }
    customVoices[key] = { blob, url: URL.createObjectURL(blob) };
    notifyVoiceStatus();
    return openVoiceDB().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
      });
    });
  }

  function deleteCustomVoice(letterKey) {
    const key = letterKey.toUpperCase();
    if (customVoices[key]) {
      if (customVoices[key].url) URL.revokeObjectURL(customVoices[key].url);
      delete customVoices[key];
    }
    notifyVoiceStatus();
    return openVoiceDB().then(db => {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
      });
    }).catch(() => {});
  }

  function hasCustomVoice(letterKey) {
    return Boolean(customVoices[letterKey.toUpperCase()]);
  }

  function getCustomVoiceBlob(letterKey) {
    const rec = customVoices[letterKey.toUpperCase()];
    return rec ? rec.blob : null;
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  async function exportVoicePackJSON() {
    const keys = Object.keys(customVoices);
    const pack = {};
    for (const k of keys) {
      pack[k] = await blobToDataURL(customVoices[k].blob);
    }
    return JSON.stringify({ app: 'AlfabetCeria', version: 1, voices: pack });
  }

  async function importVoicePackJSON(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || !parsed.voices) throw new Error('Format file paket suara tidak valid');
    const entries = Object.entries(parsed.voices);
    let count = 0;
    for (const [k, dataUrl] of entries) {
      const blob = dataURLToBlob(dataUrl);
      await saveCustomVoice(k, blob);
      count++;
    }
    return count;
  }

  loadAllCustomVoices();

  function scoreIndonesianVoice(v) {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();

    if (
      lang.startsWith('en') ||
      name.includes('english') ||
      name.includes('zira') ||
      name.includes('david') ||
      name.includes('mark') ||
      name.includes('aria') ||
      name.includes('jenny')
    ) {
      return -100;
    }

    const isIndonesian =
      lang === 'id' ||
      lang.startsWith('id-') ||
      lang === 'in-id' ||
      lang === 'ind' ||
      name.includes('indonesia') ||
      name.includes('bahasa indonesia') ||
      name.includes('gadis') ||
      name.includes('damayanti');

    if (!isIndonesian) return -1;

    let score = 60;
    const isMale = /\b(ardi|andika|male|pria|laki|man|boy)\b/.test(name);
    if (isMale) score -= 40;

    if (name.includes('google bahasa indonesia')) score += 120;
    if (name.includes('gadis') && name.includes('natural')) score += 115;
    if (name.includes('gadis')) score += 105;
    if (name.includes('damayanti')) score += 100;
    if (/\b(female|woman|wanita|perempuan|siti|ayu|putri|indah|dewi|sari)\b/.test(name)) score += 85;
    if (lang === 'id-id') score += 20;

    return score;
  }

  function refreshVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return;

    const scored = voices
      .map(v => ({ voice: v, score: scoreIndonesianVoice(v) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    idVoicesList = scored.map(s => s.voice);

    if (idVoicesList.length > 0) {
      const savedMatch = preferredVoiceURI
        ? idVoicesList.find(v => v.voiceURI === preferredVoiceURI)
        : null;
      selectedIdVoice = savedMatch || idVoicesList[0];
    } else {
      selectedIdVoice = null;
    }

    notifyVoiceStatus();
  }

  function setPreferredVoice(voiceURI) {
    preferredVoiceURI = voiceURI || '';
    localStorage.setItem('alfabet_id_voice_uri', preferredVoiceURI);
    refreshVoices();
  }

  function setAudioMode(newMode) {
    if (['auto', 'online', 'offline'].includes(newMode)) {
      audioMode = newMode;
      localStorage.setItem('alfabet_audio_mode', audioMode);
      notifyVoiceStatus();
    }
  }

  function notifyVoiceStatus() {
    if (typeof onVoiceReadyCallback === 'function') {
      onVoiceReadyCallback(getVoiceStatus());
    }
  }

  if ('speechSynthesis' in window) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
    let poll = 0;
    const timer = setInterval(() => {
      refreshVoices();
      poll++;
      if (selectedIdVoice || poll > 30) clearInterval(timer);
    }, 150);
  }

  window.addEventListener('online', notifyVoiceStatus);
  window.addEventListener('offline', notifyVoiceStatus);

  function getVoiceStatus() {
    const customCount = Object.keys(customVoices).length;
    const isOnline = navigator.onLine !== false;
    const modeTag = audioMode === 'offline' ? 'Offline' : (audioMode === 'online' ? 'Online' : 'Otomatis');

    if (customCount === 26) {
      return { ready: true, label: `Suara Guru (26/26) • ${modeTag}` };
    }
    if (window.AndroidBridge && window.AndroidBridge.speak) {
      return { ready: true, label: `Suara Indonesia APK • ${modeTag}` };
    }
    if (selectedIdVoice) {
      let cleanName = selectedIdVoice.name
        .replace(/Microsoft\s+/i, '')
        .replace(/Online\s*\(Natural\)\s*/i, '')
        .replace(/-\s*Indonesian\s*\(Indonesia\)/i, '')
        .trim();
      const extra = customCount > 0 ? ` + ${customCount} Guru` : '';
      return { ready: true, label: `${cleanName} (ID)${extra} • ${modeTag}` };
    }
    if ((audioMode === 'auto' || audioMode === 'online') && isOnline) {
      return { ready: true, label: `Suara Wanita Indonesia (Online) • ${modeTag}` };
    }
    return { ready: true, label: `Suara Sistem Offline (id-ID) • ${modeTag}` };
  }

  function onVoiceStatusChange(cb) {
    onVoiceReadyCallback = cb;
    cb(getVoiceStatus());
  }

  function getContext() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function unlockAudio() {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    refreshVoices();
    if (soundEnabled && bgmEnabled && !bgmTimer) startBgm();
  }

  ['pointerdown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { passive: true });
  });

  function playBgmNote() {
    if (!soundEnabled || !bgmEnabled || isSpeakingNow) return;
    const freq = BGM_MELODY[bgmIndex];
    bgmIndex = (bgmIndex + 1) % BGM_MELODY.length;

    if (freq > 0) {
      try {
        const ctx = getContext();
        if (ctx && ctx.state === 'running') {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.013, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch (e) {}
    }
  }

  function startBgm() {
    if (bgmTimer || !soundEnabled || !bgmEnabled) return;
    bgmTimer = setInterval(playBgmNote, 340);
  }

  function stopBgm() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  function playTone(freq, type, duration, delay) {
    if (!soundEnabled) return;
    type = type || 'sine';
    duration = duration || 0.2;
    delay = delay || 0;

    try {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  function playCorrect() {
    if (!soundEnabled) return;
    playTone(523.25, 'triangle', 0.14, 0);
    playTone(659.25, 'triangle', 0.14, 0.1);
    playTone(783.99, 'triangle', 0.32, 0.2);
  }

  function playWrong() {
    if (!soundEnabled) return;
    playTone(330, 'sawtooth', 0.18, 0);
    playTone(255, 'sawtooth', 0.28, 0.16);
  }

  function playClick() {
    if (!soundEnabled) return;
    playTone(780, 'sine', 0.055, 0);
  }

  function playPop() {
    if (!soundEnabled) return;
    playTone(420, 'sine', 0.06, 0);
    playTone(880, 'triangle', 0.10, 0.03);
    playTone(1174.66, 'triangle', 0.18, 0.07);
  }

  function playVictory() {
    if (!soundEnabled) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      playTone(f, 'triangle', 0.24, idx * 0.12);
    });
  }

  function playTrainWhoosh() {
    if (!soundEnabled) return;
    playTone(587.33, 'triangle', 0.11, 0);
    playTone(783.99, 'triangle', 0.16, 0.08);
    playTone(1046.5, 'sine', 0.18, 0.16);
  }

  function playTrainStart() {
    if (!soundEnabled) return;
    playTone(523.25, 'triangle', 0.18, 0);
    playTone(659.25, 'triangle', 0.18, 0);
    playTone(523.25, 'triangle', 0.28, 0.24);
    playTone(659.25, 'triangle', 0.28, 0.24);
  }

  function playCrySound() {
    if (!soundEnabled) return;
    playTone(440, 'sine', 0.24, 0.05);
    playTone(392, 'sine', 0.28, 0.32);
    playTone(349.23, 'sine', 0.38, 0.62);
  }

  function stopSpeech() {
    isSpeakingNow = false;
    if (speakDelayTimer) {
      clearTimeout(speakDelayTimer);
      speakDelayTimer = null;
    }
    if (currentHtmlAudio) {
      try {
        currentHtmlAudio.pause();
        currentHtmlAudio.currentTime = 0;
      } catch (e) {}
      currentHtmlAudio = null;
    }
    if (window.AndroidBridge && window.AndroidBridge.stopSpeaking) {
      window.AndroidBridge.stopSpeaking();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function playHtmlAudio(url, onFailCallback) {
    if (!soundEnabled) return;
    const audio = new Audio();
    audio.referrerPolicy = 'no-referrer';
    audio.src = url;
    currentHtmlAudio = audio;
    isSpeakingNow = true;

    let handled = false;
    audio.onended = () => {
      isSpeakingNow = false;
      currentHtmlAudio = null;
    };
    audio.onerror = () => {
      if (handled) return;
      handled = true;
      isSpeakingNow = false;
      currentHtmlAudio = null;
      if (typeof onFailCallback === 'function') onFailCallback();
    };
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (handled) return;
        handled = true;
        isSpeakingNow = false;
        currentHtmlAudio = null;
        if (typeof onFailCallback === 'function') onFailCallback();
      });
    }
  }

  function speakViaWebSpeech(text) {
    if (!('speechSynthesis' in window)) return;
    refreshVoices();

    speakDelayTimer = setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'id-ID';
        utter.rate = 0.94;
        utter.pitch = 1.06;
        utter.volume = 1.0;

        if (selectedIdVoice) {
          utter.voice = selectedIdVoice;
          utter.lang = selectedIdVoice.lang || 'id-ID';
        }

        utter.onstart = () => { isSpeakingNow = true; };
        utter.onend = () => { isSpeakingNow = false; };
        utter.onerror = () => { isSpeakingNow = false; };

        window.speechSynthesis.speak(utter);
      } catch (e) {
        isSpeakingNow = false;
      }
    }, 30);
  }

  function speakViaOnlineTTS(text, fallbackFn) {
    const cleanText = String(text || '').trim().slice(0, 180);
    if (!cleanText) return;
    const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=id&q=' + encodeURIComponent(cleanText);
    playHtmlAudio(url, fallbackFn);
  }

  function continueSpeechPipeline(text) {
    if (window.AndroidBridge && window.AndroidBridge.speak) {
      window.AndroidBridge.speak(text);
      return;
    }

    refreshVoices();
    const isOnline = navigator.onLine !== false;

    if (audioMode === 'offline') {
      speakViaWebSpeech(text);
      return;
    }

    if (audioMode === 'online' && isOnline) {
      speakViaOnlineTTS(text, () => speakViaWebSpeech(text));
      return;
    }

    if (selectedIdVoice) {
      speakViaWebSpeech(text);
    } else if (isOnline) {
      speakViaOnlineTTS(text, () => speakViaWebSpeech(text));
    } else {
      speakViaWebSpeech(text);
    }
  }

  function speakIndonesianText(text, letterKey) {
    if (!soundEnabled || !text) return;
    stopSpeech();

    const key = letterKey ? letterKey.toUpperCase() : null;

    if (key && customVoices[key] && customVoices[key].url) {
      playHtmlAudio(customVoices[key].url, () => continueSpeechPipeline(text));
      return;
    }

    if (key && !missingStaticAudio.has(key)) {
      const staticUrl = `assets/audio/${key.toLowerCase()}.mp3`;
      playHtmlAudio(staticUrl, () => {
        missingStaticAudio.add(key);
        continueSpeechPipeline(text);
      });
      return;
    }

    continueSpeechPipeline(text);
  }

  function speakLetterPrompt(item, modeType) {
    if (!item) return;
    if (modeType === 'balloon') {
      speakIndonesianText(`Ayo sentuh balon huruf, ${item.ttsName}!`, item.letter);
    } else if (modeType === 'quiz') {
      speakIndonesianText(`Cari huruf, ${item.ttsName}! Seperti pada kata, ${item.word}.`, item.letter);
    } else if (modeType === 'learn') {
      speakIndonesianText(`Huruf ${item.ttsName} besar, dan ${item.ttsName} kecil. ${item.ttsName}, untuk ${item.word}.`, item.letter);
    } else {
      speakIndonesianText(`Huruf ${item.ttsName}`, item.letter);
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      playTone(523.25, 'sine', 0.14, 0);
      if (bgmEnabled) startBgm();
    } else {
      stopSpeech();
      stopBgm();
    }
    return soundEnabled;
  }

  function toggleBgm() {
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled && soundEnabled) startBgm();
    else stopBgm();
    return bgmEnabled;
  }

  return {
    playCorrect,
    playWrong,
    playClick,
    playPop,
    playVictory,
    playCrySound,
    playTrainWhoosh,
    playTrainStart,
    speakIndonesianText,
    speakLetterPrompt,
    stopSpeech,
    toggleSound,
    toggleBgm,
    getVoiceStatus,
    onVoiceStatusChange,
    getAvailableIndonesianVoices: () => idVoicesList,
    getSelectedVoiceURI: () => (selectedIdVoice ? selectedIdVoice.voiceURI : ''),
    setPreferredVoice,
    getAudioMode: () => audioMode,
    setAudioMode,
    saveCustomVoice,
    deleteCustomVoice,
    hasCustomVoice,
    getCustomVoiceBlob,
    exportVoicePackJSON,
    importVoicePackJSON,
    isSoundEnabled: () => soundEnabled,
    isBgmEnabled: () => bgmEnabled
  };
})();
