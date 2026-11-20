/* ==========================================================================
   LOGIKA GAME ALFABET CERIA (IFP 75" RASIO 16:9 - ZERO SCROLL)
   - Papan Huruf & Fonik (A - Z)
   - Tebak Pasangan Huruf (1 Pemain, Anti-Nyontek)
   - Game Bola Boni (Balon Huruf Beterbangan 1 Pemain, Anti-Nyontek):
     * Wajah awal datar dengan variasi aksesori (kacamata hitam, mata bajak laut,
       kacamata bulat, normal, melirik)
     * Salah klik 1x -> balon menangis
     * Salah klik 2x pada balon huruf yang sama -> balon emosi / marah
     * Salah klik >= 3x pada balon huruf yang sama -> balon emot mati (X_X)
     * Jawaban benar -> mata balon berubah menjadi love-love sebelum meletus!
   - Mode Adu / VS (2 Pemain): Adu Kartu Huruf & Adu Bola Boni
     dengan Animasi Anak SD Berseragam Merah Putih Menangis untuk yang Kalah!
   ========================================================================== */
(function () {
  const DATA = window.ALPHABET_DATA;
  const AudioFX = window.AlfabetAudio;
  const Confetti = window.AlfabetConfetti;

  const BALLOON_THEMES = [
    { bg: 'radial-gradient(circle at 32% 28%, #FDE047, #EAB308 72%, #A16207)', border: '#CA8A04', text: '#FFFFFF' },
    { bg: 'radial-gradient(circle at 32% 28%, #93C5FD, #2563EB 72%, #1E3A8A)', border: '#1D4ED8', text: '#FFFFFF' },
    { bg: 'radial-gradient(circle at 32% 28%, #6EE7B7, #059669 72%, #064E3B)', border: '#047857', text: '#FFFFFF' },
    { bg: 'radial-gradient(circle at 32% 28%, #FDBA74, #EA580C 74%, #9A3412)', border: '#C2410C', text: '#FFFFFF' },
    { bg: 'radial-gradient(circle at 32% 28%, #D8B4FE, #7C3AED 72%, #4C1D95)', border: '#6D28D9', text: '#FFFFFF' },
    { bg: 'radial-gradient(circle at 32% 28%, #5EEAD4, #0D9488 72%, #115E59)', border: '#0F766E', text: '#FFFFFF' }
  ];

  // Variasi gaya mata/aksesori balon saat wajah datar
  const FACE_STYLES = ['normal', 'glasses', 'pirate', 'round_glasses', 'side_glance'];

  // State Umum
  let currentView = 'menu';
  let currentSelectedPhonic = DATA[0];

  // State Single Player Quiz
  const SP_TOTAL_ROUNDS = 10;
  let spScore = 0;
  let spStreak = 0;
  let spRound = 0;
  let spQuestion = null;
  let spCanAnswer = true;
  let spNextTimer = null;

  // State Game Bola Boni (1 Pemain)
  const BONI_TOTAL_ROUNDS = 10;
  let boniScore = 0;
  let boniStreak = 0;
  let boniRound = 0;
  let boniTarget = null;
  let boniCanAnswer = true;
  let boniNextTimer = null;
  let boniBalloons = [];
  let boniRafId = null;

  // State Mode Adu / VS (2 Pemain: 'cards' atau 'boni')
  const VS_TOTAL_ROUNDS = 8;
  let vsSubMode = 'cards';
  let p1Score = 0;
  let p2Score = 0;
  let vsRound = 0;
  let vsTarget = null;
  let vsLocked = false;
  let vsNextTimer = null;
  let vsBalloonsP1 = [];
  let vsBalloonsP2 = [];
  let vsBoniRafId = null;

  // State Studio Suara Guru
  let mediaRecorder = null;
  let recordingChunks = [];
  let recordingLetter = null;

  const $ = (id) => document.getElementById(id);

  // Kunci geser layar / zoom tak disengaja di panel sentuh IFP
  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // --------------------------------------------------------------------------
  // GENERATOR SVG WAJAH BALON BONI (DATAR, NANGIS, EMOSI, MATI, LOVE-LOVE)
  // --------------------------------------------------------------------------
  function buildBalloonFaceSVG(faceStyle, emotion) {
    // 1. JAWABAN BENAR -> MATA LOVE-LOVE & SENYUM BAHAGIA
    if (emotion === 'love') {
      return `
        <svg class="balloon-face-svg" viewBox="0 0 120 72" fill="none">
          <ellipse cx="22" cy="44" rx="8" ry="5" fill="#FDA4AF" opacity="0.8"/>
          <ellipse cx="98" cy="44" rx="8" ry="5" fill="#FDA4AF" opacity="0.8"/>
          <path d="M40 36 C40 36 25 26 25 17 C25 11 31 8 36 12 C38 14 40 16 40 16 C40 16 42 14 44 12 C49 8 55 11 55 17 C55 26 40 36 40 36 Z" fill="#FF1E56" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M80 36 C80 36 65 26 65 17 C65 11 71 8 76 12 C78 14 80 16 80 16 C80 16 82 14 84 12 C89 8 95 11 95 17 C95 26 80 36 80 36 Z" fill="#FF1E56" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M40 45 Q60 68 80 45 Z" fill="#BE123C" stroke="#1E293B" stroke-width="3.5" stroke-linejoin="round"/>
          <path d="M48 53 Q60 63 72 53" fill="#FB7185"/>
        </svg>
      `;
    }

    // 2. SALAH KLIK >= 3 KALI -> EMOT MATI (MATA X X & LIDAH MENJULUR)
    if (emotion === 'dead') {
      return `
        <svg class="balloon-face-svg" viewBox="0 0 120 72" fill="none">
          <path d="M30 14 L48 32 M48 14 L30 32" stroke="#1E293B" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M72 14 L90 32 M90 14 L72 32" stroke="#1E293B" stroke-width="5.5" stroke-linecap="round"/>
          <line x1="38" y1="48" x2="82" y2="48" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M62 48 V59 C62 65 74 65 74 59 V48 Z" fill="#FB7185" stroke="#1E293B" stroke-width="3"/>
          <line x1="68" y1="49" x2="68" y2="59" stroke="#BE123C" stroke-width="2"/>
        </svg>
      `;
    }

    // 3. SALAH KLIK 2 KALI -> EMOSI / MARAH BESAR
    if (emotion === 'angry') {
      return `
        <svg class="balloon-face-svg" viewBox="0 0 120 72" fill="none">
          <circle cx="40" cy="24" r="10.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
          <circle cx="42" cy="25" r="5" fill="#1E293B"/>
          <circle cx="80" cy="24" r="10.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
          <circle cx="78" cy="25" r="5" fill="#1E293B"/>
          <path d="M24 11 L52 20" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
          <path d="M96 11 L68 20" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
          <circle cx="19" cy="40" r="5" fill="#FFFFFF" opacity="0.85"/>
          <circle cx="101" cy="40" r="5" fill="#FFFFFF" opacity="0.85"/>
          <path d="M38 45 Q60 38 82 45 L79 60 Q60 54 41 60 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5" stroke-linejoin="round"/>
          <line x1="39" y1="52" x2="81" y2="52" stroke="#1E293B" stroke-width="2.5"/>
          <line x1="50" y1="43" x2="50" y2="58" stroke="#1E293B" stroke-width="2.2"/>
          <line x1="60" y1="42" x2="60" y2="57" stroke="#1E293B" stroke-width="2.2"/>
          <line x1="70" y1="43" x2="70" y2="58" stroke="#1E293B" stroke-width="2.2"/>
        </svg>
      `;
    }

    // 4. SALAH KLIK 1 KALI -> MENANGIS BERDERAI AIR MATA
    if (emotion === 'cry') {
      const accessoryTop = faceStyle === 'pirate'
        ? `<path d="M66 13 H94 V23 C94 31 87 35 80 35 C73 35 66 31 66 23 Z" fill="#0F172A"/>
           <line x1="20" y1="7" x2="100" y2="29" stroke="#0F172A" stroke-width="3"/>`
        : (faceStyle === 'glasses'
          ? `<rect x="24" y="13" width="30" height="17" rx="4" fill="#0F172A" opacity="0.88"/>
             <rect x="66" y="13" width="30" height="17" rx="4" fill="#0F172A" opacity="0.88"/>
             <line x1="54" y1="19" x2="66" y2="19" stroke="#0F172A" stroke-width="3.5"/>`
          : '');

      return `
        <svg class="balloon-face-svg" viewBox="0 0 120 72" fill="none">
          <path d="M26 16 L47 10" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M94 16 L73 10" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M30 18 L44 24 L30 30" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 18 L76 24 L90 30" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          ${accessoryTop}
          <path d="M32 31 C26 42 26 52 32 52 C38 52 38 42 32 31 Z" fill="#38BDF8" stroke="#0284C7" stroke-width="1.5"/>
          <path d="M88 31 C82 42 82 52 88 52 C94 52 94 42 88 31 Z" fill="#38BDF8" stroke="#0284C7" stroke-width="1.5"/>
          <path d="M43 58 Q60 43 77 58" stroke="#1E293B" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        </svg>
      `;
    }

    // 5. AWAL / NETRAL -> WAJAH DATAR DENGAN VARIASI MATA & AKSESORI
    let eyesMarkup = '';
    if (faceStyle === 'glasses') {
      eyesMarkup = `
        <rect x="23" y="12" width="32" height="20" rx="5" fill="#0F172A"/>
        <rect x="65" y="12" width="32" height="20" rx="5" fill="#0F172A"/>
        <line x1="55" y1="19" x2="65" y2="19" stroke="#0F172A" stroke-width="4"/>
        <line x1="16" y1="16" x2="23" y2="18" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="97" y1="18" x2="104" y2="16" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="29" y1="16" x2="36" y2="26" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
        <line x1="71" y1="16" x2="78" y2="26" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
      `;
    } else if (faceStyle === 'pirate') {
      eyesMarkup = `
        <line x1="25" y1="11" x2="49" y2="11" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="39" cy="23" r="9.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        <circle cx="40" cy="23" r="4.5" fill="#1E293B"/>
        <circle cx="41.5" cy="21.5" r="1.5" fill="#FFFFFF"/>
        <line x1="18" y1="6" x2="103" y2="30" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M65 13 H95 V23 C95 32 88 36 80 36 C72 36 65 32 65 23 Z" fill="#0F172A"/>
      `;
    } else if (faceStyle === 'round_glasses') {
      eyesMarkup = `
        <circle cx="40" cy="23" r="12" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
        <circle cx="80" cy="23" r="12" fill="#FFFFFF" stroke="#1E293B" stroke-width="3.5"/>
        <line x1="52" y1="23" x2="68" y2="23" stroke="#1E293B" stroke-width="3.5"/>
        <circle cx="40" cy="23" r="4.8" fill="#1E293B"/>
        <circle cx="80" cy="23" r="4.8" fill="#1E293B"/>
        <circle cx="41.5" cy="21.5" r="1.5" fill="#FFFFFF"/>
        <circle cx="81.5" cy="21.5" r="1.5" fill="#FFFFFF"/>
      `;
    } else if (faceStyle === 'side_glance') {
      eyesMarkup = `
        <line x1="28" y1="11" x2="50" y2="11" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="70" y1="11" x2="92" y2="11" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="40" cy="23" r="9.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        <circle cx="80" cy="23" r="9.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        <circle cx="44" cy="23" r="4.5" fill="#1E293B"/>
        <circle cx="84" cy="23" r="4.5" fill="#1E293B"/>
      `;
    } else {
      eyesMarkup = `
        <circle cx="40" cy="23" r="9.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        <circle cx="80" cy="23" r="9.5" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
        <circle cx="40" cy="23" r="4.8" fill="#1E293B"/>
        <circle cx="80" cy="23" r="4.8" fill="#1E293B"/>
        <circle cx="42" cy="21" r="1.6" fill="#FFFFFF"/>
        <circle cx="82" cy="21" r="1.6" fill="#FFFFFF"/>
      `;
    }

    return `
      <svg class="balloon-face-svg" viewBox="0 0 120 72" fill="none">
        ${eyesMarkup}
        <line x1="42" y1="50" x2="78" y2="50" stroke="#1E293B" stroke-width="4.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  function updateBalloonFace(bState, emotion) {
    bState.emotion = emotion;
    const faceWrap = bState.el.querySelector('.balloon-face-wrap');
    if (faceWrap) {
      faceWrap.innerHTML = buildBalloonFaceSVG(bState.faceStyle, emotion);
    }
    bState.el.classList.remove('emotion-flat', 'emotion-cry', 'emotion-angry', 'emotion-dead', 'emotion-love');
    bState.el.classList.add('emotion-' + emotion);
  }

  // --------------------------------------------------------------------------
  // KONTROL HEADER & STATUS SUARA INDONESIA
  // --------------------------------------------------------------------------
  function updateAudioButtons() {
    const soundOn = AudioFX.isSoundEnabled();
    const bgmOn = AudioFX.isBgmEnabled();

    $('audioIcon').textContent = soundOn ? '🔊' : '🔇';
    $('audioStatusText').textContent = soundOn ? 'Suara: Nyala' : 'Suara: Mati';
    $('btnAudioToggle').classList.toggle('is-muted', !soundOn);

    $('bgmIcon').textContent = (bgmOn && soundOn) ? '🎵' : '🔕';
    $('bgmStatusText').textContent = (bgmOn && soundOn) ? 'Musik: Nyala' : 'Musik: Mati';
    $('btnBgmToggle').classList.toggle('is-muted', !(bgmOn && soundOn));
  }

  function updateVoiceBadge(status) {
    const badge = $('voiceStatusLabel');
    if (!badge) return;
    badge.textContent = (status.ready ? '🎙️ ' : '⚠️ ') + status.label;
    badge.classList.toggle('is-warn', !status.ready);
  }

  function toggleFullscreen() {
    AudioFX.playClick();
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  function updateFullscreenButton() {
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    $('fsIcon').textContent = isFs ? '🗗' : '⛶';
    $('fsText').textContent = isFs ? 'Keluar Penuh' : 'Layar Penuh';
  }

  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

  function stopAllLoopsAndTimers() {
    if (spNextTimer) { clearTimeout(spNextTimer); spNextTimer = null; }
    if (boniNextTimer) { clearTimeout(boniNextTimer); boniNextTimer = null; }
    if (vsNextTimer) { clearTimeout(vsNextTimer); vsNextTimer = null; }
    if (boniRafId) { cancelAnimationFrame(boniRafId); boniRafId = null; }
    if (vsBoniRafId) { cancelAnimationFrame(vsBoniRafId); vsBoniRafId = null; }
    if (window.KeretaWush) window.KeretaWush.stop();
  }

  function navigateTo(viewName) {
    AudioFX.playClick();
    AudioFX.stopSpeech();
    stopAllLoopsAndTimers();
    closeModal();
    closeVoiceStudio();

    currentView = viewName;
    ['viewMenu', 'viewLearn', 'viewSinglePlayer', 'viewBoniSingle', 'viewMultiPlayer', 'viewTrain'].forEach(id => {
      $(id).classList.add('is-hidden');
    });

    if (viewName === 'menu') {
      $('viewMenu').classList.remove('is-hidden');
    } else if (viewName === 'learn') {
      $('viewLearn').classList.remove('is-hidden');
      renderAlphabetGrid();
      selectPhonicLetter(currentSelectedPhonic, false);
    } else if (viewName === 'single') {
      $('viewSinglePlayer').classList.remove('is-hidden');
    } else if (viewName === 'boni') {
      $('viewBoniSingle').classList.remove('is-hidden');
    } else if (viewName === 'multi') {
      $('viewMultiPlayer').classList.remove('is-hidden');
    } else if (viewName === 'train') {
      $('viewTrain').classList.remove('is-hidden');
    }
  }

  function pickQuestionSet(optionCount) {
    optionCount = optionCount || 4;
    const target = DATA[Math.floor(Math.random() * DATA.length)];
    const options = [target];
    while (options.length < optionCount) {
      const cand = DATA[Math.floor(Math.random() * DATA.length)];
      if (!options.some(o => o.letter === cand.letter)) {
        options.push(cand);
      }
    }
    options.sort(() => Math.random() - 0.5);
    return { target, options };
  }

  // --------------------------------------------------------------------------
  // MODE 1: PAPAN HURUF & FONIK (A - Z DALAM 1 LAYAR PENUH 9x3)
  // --------------------------------------------------------------------------
  function renderAlphabetGrid() {
    const grid = $('alphabetGrid');
    grid.innerHTML = '';

    DATA.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.id = 'cardLetter_' + item.letter;
      card.className = 'alpha-card' + (currentSelectedPhonic.letter === item.letter ? ' is-active' : '');
      card.innerHTML = `
        <div class="alpha-pair">
          <span class="alpha-upper">${item.letter}</span>
          <span class="alpha-lower">${item.letter.toLowerCase()}</span>
        </div>
        <img src="${item.image}" alt="${item.word}" class="alpha-item-img" draggable="false">
        <div class="alpha-word">${item.word}</div>
      `;
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        selectPhonicLetter(item, true);
      });
      grid.appendChild(card);
    });

    const randBtn = document.createElement('button');
    randBtn.type = 'button';
    randBtn.className = 'alpha-card alpha-card-random';
    randBtn.innerHTML = `
      <div class="alpha-random-icon">🎲</div>
      <div class="alpha-random-title">Acak</div>
      <div class="alpha-random-sub">Pilih Huruf</div>
    `;
    randBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      let pick;
      do {
        pick = DATA[Math.floor(Math.random() * DATA.length)];
      } while (pick.letter === currentSelectedPhonic.letter);
      selectPhonicLetter(pick, true);
    });
    grid.appendChild(randBtn);
  }

  function selectPhonicLetter(item, shouldSpeak) {
    currentSelectedPhonic = item;
    $('spotlightLetterBox').textContent = item.letter;
    $('spotlightLowerBox').textContent = item.letter.toLowerCase();
    $('spotlightLetterTag').textContent = `Huruf ${item.letter} (${item.letter.toLowerCase()})`;
    $('spotlightSoundTag').textContent = `Bunyi Fonik: "${item.soundDesc}"`;
    $('spotlightWord').textContent = item.word;
    $('spotlightSentence').textContent = `"${item.letter} berbunyi ${item.soundDesc}, seperti pada kata ${item.word}!"`;
    $('spotlightImg').src = item.image;
    $('spotlightImg').alt = item.word;

    DATA.forEach(d => {
      const el = $('cardLetter_' + d.letter);
      if (el) el.classList.toggle('is-active', d.letter === item.letter);
    });

    const box = $('spotlightPairBox');
    box.classList.remove('anim-pop');
    void box.offsetWidth;
    box.classList.add('anim-pop');

    if (shouldSpeak) {
      AudioFX.playClick();
      AudioFX.speakLetterPrompt(item, 'learn');
    }
  }

  // --------------------------------------------------------------------------
  // MODE 2: TEBAK PASANGAN HURUF (1 PEMAIN - ANTI-NYONTEK)
  // --------------------------------------------------------------------------
  function startSinglePlayer() {
    navigateTo('single');
    spScore = 0;
    spStreak = 0;
    spRound = 0;
    updateSpUI();
    nextSpQuestion();
  }

  function updateSpUI() {
    $('spScore').textContent = spScore;
    $('spStreak').textContent = `${spStreak}x Beruntun`;
    $('spRoundCounter').textContent = `${Math.min(spRound, SP_TOTAL_ROUNDS)} / ${SP_TOTAL_ROUNDS}`;
  }

  function setSpFeedback(type, htmlText) {
    const box = $('spFeedbackBox');
    box.className = 'sp-feedback';
    if (!type) {
      box.classList.add('is-idle');
      box.innerHTML = '👂 Dengarkan suara dari speaker, lalu sentuh kartu huruf yang benar!';
      return;
    }
    box.classList.add(type === 'correct' ? 'is-correct' : 'is-wrong');
    box.innerHTML = htmlText;
  }

  function nextSpQuestion() {
    if (spRound >= SP_TOTAL_ROUNDS) {
      showGameOverSingle(spScore, SP_TOTAL_ROUNDS, 'Tebak Pasangan Huruf');
      return;
    }

    spRound++;
    spCanAnswer = true;
    updateSpUI();
    setSpFeedback(null);

    spQuestion = pickQuestionSet(4);
    $('spQuestionText').textContent = 'Huruf apakah yang baru saja diucapkan?';
    $('spQuestionCue').textContent = 'Ulangi Suara Soal';

    const container = $('spOptionsContainer');
    container.innerHTML = '';

    spQuestion.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sp-option-card';
      btn.innerHTML = `
        <div class="opt-pair">
          <span class="opt-upper">${opt.letter}</span>
          <span class="opt-lower">${opt.letter.toLowerCase()}</span>
        </div>
        <span class="opt-badge">Huruf ${opt.letter} ${opt.letter.toLowerCase()}</span>
      `;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleSpAnswer(opt, btn);
      });
      container.appendChild(btn);
    });

    AudioFX.speakLetterPrompt(spQuestion.target, 'quiz');
  }

  function handleSpAnswer(selected, btnEl) {
    if (!spCanAnswer) return;

    if (selected.letter === spQuestion.target.letter) {
      spCanAnswer = false;
      spScore += 10 + (spStreak * 2);
      spStreak++;
      updateSpUI();
      AudioFX.playCorrect();
      Confetti.fire({ particleCount: 45, originX: 0.5, originY: 0.68, spread: 75 });

      btnEl.classList.add('is-correct', 'anim-pop');
      setSpFeedback(
        'correct',
        `🎉 Hebat! Betul sekali, huruf <b>${selected.letter} (${selected.letter.toLowerCase()})</b> — <b>${selected.word}</b> <img src="${selected.image}" class="fb-mini-img" alt="${selected.word}">`
      );
      AudioFX.speakIndonesianText(`Pintar! Betul sekali! Huruf ${selected.ttsName}.`, selected.letter);

      spNextTimer = setTimeout(nextSpQuestion, 1650);
    } else {
      spStreak = 0;
      updateSpUI();
      AudioFX.playWrong();
      btnEl.classList.remove('anim-wiggle');
      void btnEl.offsetWidth;
      btnEl.classList.add('is-wrong', 'anim-wiggle');

      setSpFeedback(
        'wrong',
        `❌ Itu huruf <b>${selected.letter} (${selected.letter.toLowerCase()})</b>. Dengarkan suaranya lagi ya!`
      );
      AudioFX.speakLetterPrompt(spQuestion.target, 'quiz');
    }
  }

  // --------------------------------------------------------------------------
  // MODE 3: GAME BOLA BONI (BALON HURUF BERWAJAH EKSPRESIF - 1 PEMAIN)
  // --------------------------------------------------------------------------
  function startBoniSingle() {
    navigateTo('boni');
    boniScore = 0;
    boniStreak = 0;
    boniRound = 0;
    updateBoniUI();
    nextBoniRound();
  }

  function updateBoniUI() {
    $('boniScore').textContent = boniScore;
    $('boniStreak').textContent = `${boniStreak}x Beruntun`;
    $('boniRoundCounter').textContent = `${Math.min(boniRound, BONI_TOTAL_ROUNDS)} / ${BONI_TOTAL_ROUNDS}`;
  }

  function setBoniFeedback(type, htmlText) {
    const box = $('boniFeedbackBox');
    box.className = 'sp-feedback';
    if (!type) {
      box.classList.add('is-idle');
      box.innerHTML = '🎈 Dengarkan huruf yang disebutkan Boni, lalu sentuh balon hurufnya!';
      return;
    }
    box.classList.add(type === 'correct' ? 'is-correct' : 'is-wrong');
    box.innerHTML = htmlText;
  }

  function createFloatingBalloons(arenaEl, options, onTapBalloon) {
    arenaEl.innerHTML = '';
    const count = options.length;
    const list = [];
    const shuffledStyles = [...FACE_STYLES].sort(() => Math.random() - 0.5);

    options.forEach((opt, idx) => {
      const theme = BALLOON_THEMES[(idx + Math.floor(Math.random() * BALLOON_THEMES.length)) % BALLOON_THEMES.length];
      const faceStyle = shuffledStyles[idx % shuffledStyles.length];
      const slotWidth = 100 / count;
      const xPct = slotWidth * idx + slotWidth * 0.5;
      const yPct = 28 + Math.random() * 44;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'boni-balloon emotion-flat';
      el.style.background = theme.bg;
      el.style.borderColor = theme.border;
      el.style.color = theme.text;
      el.innerHTML = `
        <span class="balloon-shine"></span>
        <div class="balloon-letters">
          <span class="balloon-upper">${opt.letter}</span>
          <span class="balloon-lower">${opt.letter.toLowerCase()}</span>
        </div>
        <div class="balloon-face-wrap">
          ${buildBalloonFaceSVG(faceStyle, 'flat')}
        </div>
        <span class="balloon-knot" style="border-top-color:${theme.border}"></span>
        <svg class="balloon-string" viewBox="0 0 24 38" fill="none">
          <path d="M12 0 Q18 10 12 19 Q6 28 12 38" stroke="#64748B" stroke-width="2" fill="none"/>
        </svg>
      `;

      const state = {
        opt,
        el,
        faceStyle,
        emotion: 'flat',
        wrongClicks: 0,
        x: xPct,
        y: yPct,
        vx: (Math.random() < 0.5 ? -1 : 1) * (0.042 + Math.random() * 0.032),
        vy: -(0.05 + Math.random() * 0.04),
        phase: Math.random() * Math.PI * 2,
        popped: false
      };

      el.style.left = state.x + '%';
      el.style.top = state.y + '%';

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (!state.popped) onTapBalloon(state);
      });

      arenaEl.appendChild(el);
      list.push(state);
    });

    return list;
  }

  function stepBalloonPhysics(list, minX, maxX, minY, maxY) {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.popped) continue;

      const speedFactor = b.emotion === 'dead' ? 0.35 : 1.0;

      b.phase += 0.035 * speedFactor;
      b.x += (b.vx + Math.sin(b.phase) * 0.04) * speedFactor;
      b.y += b.vy * speedFactor;

      if (b.y < minY) b.y = maxY;
      if (b.x < minX) {
        b.x = minX;
        b.vx = Math.abs(b.vx);
      } else if (b.x > maxX) {
        b.x = maxX;
        b.vx = -Math.abs(b.vx);
      }

      for (let j = i + 1; j < list.length; j++) {
        const b2 = list[j];
        if (b2.popped) continue;
        const dx = b.x - b2.x;
        const dy = b.y - b2.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01 && dist < 18) {
          const push = (18 - dist) * 0.018;
          const nx = dx / dist;
          const ny = dy / dist;
          b.x += nx * push;
          b.y += ny * push;
          b2.x -= nx * push;
          b2.y -= ny * push;
        }
      }

      b.el.style.left = b.x.toFixed(2) + '%';
      b.el.style.top = b.y.toFixed(2) + '%';
    }
  }

  function nextBoniRound() {
    if (boniRound >= BONI_TOTAL_ROUNDS) {
      if (boniRafId) { cancelAnimationFrame(boniRafId); boniRafId = null; }
      showGameOverSingle(boniScore, BONI_TOTAL_ROUNDS, 'Game Bola Boni');
      return;
    }

    boniRound++;
    boniCanAnswer = true;
    updateBoniUI();
    setBoniFeedback(null);

    const { target, options } = pickQuestionSet(5);
    boniTarget = target;

    $('boniInstructionText').textContent = 'Sentuh Balon Huruf yang Disebutkan Boni!';

    boniBalloons = createFloatingBalloons($('boniArena'), options, (bState) => {
      handleBoniSingleTap(bState);
    });

    if (!boniRafId) {
      const tick = () => {
        stepBalloonPhysics(boniBalloons, 10, 90, 14, 84);
        boniRafId = requestAnimationFrame(tick);
      };
      boniRafId = requestAnimationFrame(tick);
    }

    AudioFX.speakLetterPrompt(boniTarget, 'balloon');
  }

  function handleBoniSingleTap(bState) {
    if (!boniCanAnswer || bState.popped) return;

    if (bState.opt.letter === boniTarget.letter) {
      boniCanAnswer = false;
      updateBalloonFace(bState, 'love');

      boniScore += 10 + (boniStreak * 2);
      boniStreak++;
      updateBoniUI();
      AudioFX.playCorrect();

      setBoniFeedback(
        'correct',
        `😍 Hebat! Balon huruf <b>${bState.opt.letter} (${bState.opt.letter.toLowerCase()})</b> matanya love-love! (${bState.opt.word} <img src="${bState.opt.image}" class="fb-mini-img" alt="${bState.opt.word}">)`
      );
      AudioFX.speakIndonesianText(`Hebat! Balon huruf ${bState.opt.ttsName}!`, bState.opt.letter);

      setTimeout(() => {
        bState.popped = true;
        bState.el.classList.add('is-popped');
        AudioFX.playPop();

        const rect = bState.el.getBoundingClientRect();
        Confetti.fire({
          particleCount: 55,
          originX: (rect.left + rect.width * 0.5) / window.innerWidth,
          originY: (rect.top + rect.height * 0.5) / window.innerHeight,
          spread: 95
        });
      }, 600);

      boniNextTimer = setTimeout(nextBoniRound, 1850);
    } else {
      boniStreak = 0;
      updateBoniUI();
      bState.wrongClicks += 1;

      bState.el.classList.remove('anim-wiggle');
      void bState.el.offsetWidth;
      bState.el.classList.add('anim-wiggle');

      if (bState.wrongClicks === 1) {
        updateBalloonFace(bState, 'cry');
        AudioFX.playCrySound();
        setBoniFeedback(
          'wrong',
          `😭 Yah, balon huruf <b>${bState.opt.letter}</b> jadi menangis! Bukan huruf <b>${bState.opt.letter}</b>, dengarkan soalnya lagi!`
        );
      } else if (bState.wrongClicks === 2) {
        updateBalloonFace(bState, 'angry');
        AudioFX.playWrong();
        setBoniFeedback(
          'wrong',
          `😡 Wah, balon huruf <b>${bState.opt.letter}</b> jadi emosi karena salah diklik 2 kali! Cari huruf lainnya ya!`
        );
      } else {
        updateBalloonFace(bState, 'dead');
        AudioFX.playWrong();
        setBoniFeedback(
          'wrong',
          `😵 Aduh, balon huruf <b>${bState.opt.letter}</b> pingsan mati! Jangan klik balon <b>${bState.opt.letter}</b> lagi ya!`
        );
      }

      setTimeout(() => {
        if (boniCanAnswer) AudioFX.speakLetterPrompt(boniTarget, 'balloon');
      }, 450);
    }
  }

  function showGameOverSingle(finalScore, rounds, modeTitle) {
    AudioFX.playVictory();
    Confetti.fire({ particleCount: 110, originX: 0.5, originY: 0.55, spread: 110 });

    $('modalMascot').textContent = finalScore >= 80 ? '🌟' : '🎈';
    $('modalTitle').textContent = finalScore >= 80 ? 'Luar Biasa, Juara Huruf!' : 'Permainan Selesai!';
    $('modalSubtitle').textContent = `Kamu telah menyelesaikan ${rounds} ronde ${modeTitle}!`;

    let stars = '⭐⭐⭐';
    if (finalScore < 50) stars = '⭐';
    else if (finalScore < 80) stars = '⭐⭐';

    $('modalScoreDetails').innerHTML = `
      <div class="modal-stars">${stars}</div>
      <p class="modal-score-line">Total Skor: <span class="text-blue">${finalScore} Poin</span></p>
      <p class="modal-tip">Hebat! Pendengaran dan ketangkasan mengenal hurufmu semakin pintar!</p>
    `;

    openModal();
    AudioFX.speakIndonesianText(`Hebat sekali! Kamu berhasil mengumpulkan ${finalScore} poin!`, null);
  }

  // --------------------------------------------------------------------------
  // MODE 4: MODE ADU / VS (2 PEMAIN: ADU KARTU HURUF & ADU BOLA BONI)
  // --------------------------------------------------------------------------
  function startMultiplayer(subMode) {
    vsSubMode = subMode || 'cards';
    navigateTo('multi');

    p1Score = 0;
    p2Score = 0;
    vsRound = 0;
    updateVsModeTabs();
    updateMpUI();
    nextMultiplayerRound();
  }

  function updateVsModeTabs() {
    $('tabVsCards').classList.toggle('is-active', vsSubMode === 'cards');
    $('tabVsBoni').classList.toggle('is-active', vsSubMode === 'boni');

    const isCards = vsSubMode === 'cards';
    $('p1OptionsGrid').classList.toggle('is-hidden', !isCards);
    $('p2OptionsGrid').classList.toggle('is-hidden', !isCards);
    $('p1BoniArena').classList.toggle('is-hidden', isCards);
    $('p2BoniArena').classList.toggle('is-hidden', isCards);
  }

  function updateMpUI() {
    $('p1Score').textContent = p1Score;
    $('p2Score').textContent = p2Score;
    $('mpRoundCounter').textContent = `Ronde ${Math.min(vsRound, VS_TOTAL_ROUNDS)} / ${VS_TOTAL_ROUNDS}`;
  }

  function clearRoundReactionOverlays() {
    ['p1ReactionOverlay', 'p2ReactionOverlay'].forEach(id => {
      const el = $(id);
      el.classList.add('is-hidden');
      el.innerHTML = '';
    });
  }

  function showRoundReaction(winnerNum) {
    const loserNum = winnerNum === 1 ? 2 : 1;
    const winOverlay = $(`p${winnerNum}ReactionOverlay`);
    const loseOverlay = $(`p${loserNum}ReactionOverlay`);

    winOverlay.innerHTML = `
      <img src="assets/sd_happy.svg" alt="Siswa SD Menang" class="round-sd-img">
      <div class="round-reaction-badge is-win">🎉 Pemain ${winnerNum} Lebih Cepat! (+10)</div>
    `;
    winOverlay.classList.remove('is-hidden');

    loseOverlay.innerHTML = `
      <img src="assets/sd_crying.svg" alt="Anak SD Pakai Baju SD Menangis" class="round-sd-img">
      <div class="round-reaction-badge is-lose">😭 Yah, Pemain ${loserNum} Kalah Cepat!</div>
    `;
    loseOverlay.classList.remove('is-hidden');
  }

  function nextMultiplayerRound() {
    if (vsRound >= VS_TOTAL_ROUNDS) {
      if (vsBoniRafId) { cancelAnimationFrame(vsBoniRafId); vsBoniRafId = null; }
    if (window.KeretaWush) window.KeretaWush.stop();
      showGameOverMultiplayer();
      return;
    }

    vsRound++;
    vsLocked = false;
    clearRoundReactionOverlays();
    updateMpUI();

    const { target, options } = pickQuestionSet(4);
    vsTarget = target;

    const p1Opts = [...options].sort(() => Math.random() - 0.5);
    const p2Opts = [...options].sort(() => Math.random() - 0.5);

    if (vsSubMode === 'cards') {
      $('mpQuestionInstruction').textContent = 'Dengarkan Suara & Rebut Kartu Huruf yang Benar!';
      $('p1Status').innerHTML = 'Dengarkan suara & sentuh kartu hurufmu! ⚡';
      $('p2Status').innerHTML = 'Dengarkan suara & sentuh kartu hurufmu! ⚡';
      renderMpCardOptions('p1OptionsGrid', p1Opts, 1);
      renderMpCardOptions('p2OptionsGrid', p2Opts, 2);
      AudioFX.speakLetterPrompt(vsTarget, 'quiz');
    } else {
      $('mpQuestionInstruction').textContent = 'Adu Bola Boni: Sentuh Balon Huruf yang Disebutkan!';
      $('p1Status').innerHTML = 'Sentuh balon huruf yang tepat secepatnya! 🎈';
      $('p2Status').innerHTML = 'Sentuh balon huruf yang tepat secepatnya! 🎈';

      vsBalloonsP1 = createFloatingBalloons($('p1BoniArena'), p1Opts, (bState) => {
        handleMpChoice(1, bState.opt, bState.el, true, bState);
      });
      vsBalloonsP2 = createFloatingBalloons($('p2BoniArena'), p2Opts, (bState) => {
        handleMpChoice(2, bState.opt, bState.el, true, bState);
      });

      if (!vsBoniRafId) {
        const tickVs = () => {
          stepBalloonPhysics(vsBalloonsP1, 14, 86, 16, 82);
          stepBalloonPhysics(vsBalloonsP2, 14, 86, 16, 82);
          vsBoniRafId = requestAnimationFrame(tickVs);
        };
        vsBoniRafId = requestAnimationFrame(tickVs);
      }

      AudioFX.speakLetterPrompt(vsTarget, 'balloon');
    }
  }

  function renderMpCardOptions(containerId, list, playerNum) {
    const box = $(containerId);
    box.innerHTML = '';

    list.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `mp-option-card mp-card-p${playerNum}`;
      btn.innerHTML = `
        <div class="mp-pair">
          <span class="mp-upper">${opt.letter}</span>
          <span class="mp-lower">${opt.letter.toLowerCase()}</span>
        </div>
        <span class="mp-sub">Huruf ${opt.letter} ${opt.letter.toLowerCase()}</span>
      `;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handleMpChoice(playerNum, opt, btn, false, null);
      });
      box.appendChild(btn);
    });
  }

  function handleMpChoice(playerNum, chosen, el, isBalloon, bState) {
    if (vsLocked) return;

    if (chosen.letter === vsTarget.letter) {
      vsLocked = true;

      if (isBalloon && bState) {
        updateBalloonFace(bState, 'love');
        AudioFX.playCorrect();
        setTimeout(() => {
          bState.popped = true;
          el.classList.add('is-popped');
          AudioFX.playPop();
        }, 420);
      } else {
        AudioFX.playCorrect();
      }

      Confetti.fire({
        particleCount: 50,
        originX: playerNum === 1 ? 0.25 : 0.75,
        originY: 0.6,
        spread: 75
      });

      $('mpQuestionInstruction').textContent = `Benar! Huruf ${vsTarget.letter} (${vsTarget.letter.toLowerCase()}) — ${vsTarget.word} ${vsTarget.emoji}`;

      if (playerNum === 1) {
        p1Score += 10;
        if (!isBalloon) el.classList.add('is-win-p1', 'anim-pop');
        $('p1Status').innerHTML = `🎉 <b>Pemain 1 Lebih Cepat & Benar! (+10)</b>`;
        $('p2Status').innerHTML = `😭 Pemain 2 kalah cepat di ronde ini!`;
      } else {
        p2Score += 10;
        if (!isBalloon) el.classList.add('is-win-p2', 'anim-pop');
        $('p2Status').innerHTML = `🎉 <b>Pemain 2 Lebih Cepat & Benar! (+10)</b>`;
        $('p1Status').innerHTML = `😭 Pemain 1 kalah cepat di ronde ini!`;
      }

      setTimeout(() => {
        showRoundReaction(playerNum);
      }, isBalloon ? 450 : 0);

      AudioFX.speakIndonesianText(`Betul! Pemain ${playerNum} lebih cepat! Huruf ${vsTarget.ttsName}.`, vsTarget.letter);
      updateMpUI();

      vsNextTimer = setTimeout(nextMultiplayerRound, 2100);
    } else {
      el.classList.remove('anim-wiggle');
      void el.offsetWidth;
      el.classList.add('is-wrong', 'anim-wiggle');
      const statusEl = $(playerNum === 1 ? 'p1Status' : 'p2Status');

      if (isBalloon && bState) {
        bState.wrongClicks += 1;
        if (bState.wrongClicks === 1) {
          updateBalloonFace(bState, 'cry');
          AudioFX.playCrySound();
          statusEl.innerHTML = `😭 Balon <b>${chosen.letter}</b> menangis! Salah pilih, coba lagi!`;
        } else if (bState.wrongClicks === 2) {
          updateBalloonFace(bState, 'angry');
          AudioFX.playWrong();
          statusEl.innerHTML = `😡 Balon <b>${chosen.letter}</b> emosi diklik 2x! Cari huruf lain!`;
        } else {
          updateBalloonFace(bState, 'dead');
          AudioFX.playWrong();
          statusEl.innerHTML = `😵 Balon <b>${chosen.letter}</b> mati! Jangan klik huruf itu lagi!`;
        }
      } else {
        AudioFX.playWrong();
        statusEl.innerHTML = `❌ Itu huruf <b>${chosen.letter}</b>, bukan itu! Coba lagi!`;
      }
    }
  }

  function showGameOverMultiplayer() {
    const modeLabel = vsSubMode === 'boni' ? 'Adu Bola Boni' : 'Adu Kartu Huruf';
    $('modalMascot').textContent = '👑';
    $('modalSubtitle').textContent = `Pertandingan ${modeLabel} (${VS_TOTAL_ROUNDS} Ronde) telah selesai!`;

    if (p1Score !== p2Score) {
      const winnerNum = p1Score > p2Score ? 1 : 2;
      const loserNum = winnerNum === 1 ? 2 : 1;
      const winScore = winnerNum === 1 ? p1Score : p2Score;
      const loseScore = loserNum === 1 ? p1Score : p2Score;
      const winColor = winnerNum === 1 ? 'text-blue' : 'text-amber';
      const loseColor = loserNum === 1 ? 'text-blue' : 'text-amber';

      AudioFX.playVictory();
      setTimeout(() => AudioFX.playCrySound(), 650);
      Confetti.fire({ particleCount: 140, originX: 0.5, originY: 0.5, spread: 120 });

      $('modalTitle').textContent = `🏆 Pemain ${winnerNum} Juara!`;
      $('modalScoreDetails').innerHTML = `
        <div class="vs-result-arena">
          <div class="vs-result-card is-winner">
            <span class="vs-role-tag tag-win">👑 PEMENANG</span>
            <img src="assets/sd_happy.svg" alt="Siswa SD Menang" class="vs-sd-avatar">
            <strong class="vs-player-title ${winColor}">Pemain ${winnerNum}</strong>
            <span class="vs-player-pts ${winColor}">${winScore} Poin</span>
          </div>

          <div class="vs-result-card is-loser">
            <span class="vs-role-tag tag-lose">😭 KALAH</span>
            <img src="assets/sd_crying.svg" alt="Anak SD Pakai Baju SD Menangis" class="vs-sd-avatar">
            <strong class="vs-player-title ${loseColor}">Pemain ${loserNum} Menangis</strong>
            <span class="vs-player-pts ${loseColor}">${loseScore} Poin</span>
          </div>
        </div>
        <p class="modal-tip">Jangan bersedih ya Pemain ${loserNum}, ayo tanding ulang dan raih juara!</p>
      `;

      AudioFX.speakIndonesianText(`Hore! Pemain ${winnerNum} menang! Pemain ${loserNum} jangan menangis ya, ayo coba lagi!`, null);
    } else {
      AudioFX.playVictory();
      Confetti.fire({ particleCount: 140, originX: 0.5, originY: 0.5, spread: 120 });
      $('modalTitle').textContent = '🤝 Seri Sama Kuat!';
      $('modalScoreDetails').innerHTML = `
        <div class="vs-result-arena">
          <div class="vs-result-card is-winner">
            <span class="vs-role-tag tag-win">⭐ SERI</span>
            <img src="assets/sd_happy.svg" alt="Siswa SD" class="vs-sd-avatar">
            <strong class="vs-player-title text-blue">Pemain 1</strong>
            <span class="vs-player-pts text-blue">${p1Score} Poin</span>
          </div>
          <div class="vs-result-card is-winner">
            <span class="vs-role-tag tag-win">⭐ SERI</span>
            <img src="assets/sd_happy.svg" alt="Siswa SD" class="vs-sd-avatar">
            <strong class="vs-player-title text-amber">Pemain 2</strong>
            <span class="vs-player-pts text-amber">${p2Score} Poin</span>
          </div>
        </div>
        <p class="modal-tip">Luar biasa! Kedua siswa sama-sama cepat dan hebat!</p>
      `;
      AudioFX.speakIndonesianText('Luar biasa! Skor kalian berdua seri sama kuat!', null);
    }

    openModal();
  }

  // --------------------------------------------------------------------------
  // STUDIO SUARA INDONESIA (PILIH SUARA WANITA INDONESIA / REKAM / UNGGAH)
  // --------------------------------------------------------------------------

  function checkPortraitOrientation() {
    const overlay = $('portraitLockOverlay');
    if (!overlay) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    overlay.classList.toggle('is-visible', isPortrait);
  }

  function forceLandscapeMode() {
    const el = document.documentElement;
    const reqFs = el.requestFullscreen || el.webkitRequestFullscreen;
    const doLock = () => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
      setTimeout(checkPortraitOrientation, 250);
    };
    if (reqFs) {
      Promise.resolve(reqFs.call(el)).then(doLock).catch(doLock);
    } else {
      doLock();
    }
  }

  window.addEventListener('resize', checkPortraitOrientation);
  window.addEventListener('orientationchange', () => setTimeout(checkPortraitOrientation, 120));

  function updateAudioModeButtons() {
    const m = AudioFX.getAudioMode();
    ['auto', 'online', 'offline'].forEach(k => {
      const btn = $('btnAudioMode_' + k);
      if (btn) btn.classList.toggle('is-active', m === k);
    });
  }

  function openVoiceStudio() {
    AudioFX.playClick();
    AudioFX.stopSpeech();
    updateAudioModeButtons();
    populateVoiceSelect();
    renderVoiceStudioGrid();
    $('voiceStudioModal').classList.remove('is-hidden');
  }

  function closeVoiceStudio() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    $('voiceStudioModal').classList.add('is-hidden');
  }

  function populateVoiceSelect() {
    const sel = $('idVoiceSelect');
    sel.innerHTML = '';
    const voices = AudioFX.getAvailableIndonesianVoices();
    const currentURI = AudioFX.getSelectedVoiceURI();

    if (!voices.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Belum terdeteksi paket TTS Bahasa Indonesia di browser IFP ini';
      sel.appendChild(opt);
      return;
    }

    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === currentURI) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function renderVoiceStudioGrid() {
    const grid = $('voiceStudioGrid');
    grid.innerHTML = '';

    DATA.forEach(item => {
      const hasRec = AudioFX.hasCustomVoice(item.letter);
      const isRecNow = recordingLetter === item.letter;

      const row = document.createElement('div');
      row.className = 'vs-rec-item' + (hasRec ? ' has-rec' : '');
      row.innerHTML = `
        <div class="vs-rec-letter">${item.letter} <small>(${item.ttsName})</small></div>
        <div class="vs-rec-btns">
          <button type="button" class="rec-btn rec-play" title="Putar Suara">▶</button>
          <button type="button" class="rec-btn rec-mic ${isRecNow ? 'is-recording' : ''}" title="Rekam Suara Guru">${isRecNow ? '⏹' : '🎙️'}</button>
          <label class="rec-btn rec-upload" title="Unggah File Audio MP3/WAV/M4A">
            📂<input type="file" accept="audio/*" class="is-hidden">
          </label>
          ${hasRec ? '<button type="button" class="rec-btn rec-dl" title="Unduh Rekaman untuk APK/GitHub">⬇️</button>' : ''}
          ${hasRec ? '<button type="button" class="rec-btn rec-del" title="Hapus Rekaman">🗑️</button>' : ''}
        </div>
      `;

      row.querySelector('.rec-play').addEventListener('click', () => {
        AudioFX.speakIndonesianText(`Huruf ${item.ttsName}. ${item.ttsName} untuk ${item.word}.`, item.letter);
      });

      row.querySelector('.rec-mic').addEventListener('click', () => {
        toggleRecordLetter(item.letter);
      });

      const fileInput = row.querySelector('input[type="file"]');
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          AudioFX.saveCustomVoice(item.letter, file).then(() => {
            $('voiceStudioStatus').textContent = `✅ File audio untuk huruf "${item.letter}" berhasil dipasang!`;
            renderVoiceStudioGrid();
          });
        }
      });

      const dlBtn = row.querySelector('.rec-dl');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          const blob = AudioFX.getCustomVoiceBlob(item.letter);
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          const ext = (blob.type && blob.type.includes('mp3')) ? 'mp3' : ((blob.type && blob.type.includes('wav')) ? 'wav' : 'webm');
          a.download = `${item.letter.toLowerCase()}.${ext}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        });
      }

      const delBtn = row.querySelector('.rec-del');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          AudioFX.deleteCustomVoice(item.letter).then(renderVoiceStudioGrid);
        });
      }

      grid.appendChild(row);
    });
  }

  function toggleRecordLetter(letter) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('voiceStudioStatus').textContent = '⚠️ Mikrofon tidak terdeteksi. Anda dapat memakai tombol 📂 untuk mengunggah file rekaman MP3/M4A dari HP.';
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      recordingLetter = letter;
      recordingChunks = [];
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordingChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const savedKey = recordingLetter;
        recordingLetter = null;
        AudioFX.saveCustomVoice(savedKey, blob).then(() => {
          $('voiceStudioStatus').textContent = `✅ Rekaman suara guru untuk huruf "${savedKey}" berhasil disimpan!`;
          renderVoiceStudioGrid();
        });
      };

      mediaRecorder.start();
      $('voiceStudioStatus').textContent = `🔴 Sedang merekam huruf "${letter}"... Ucapkan "${letter}" lalu tekan ⏹ untuk berhenti.`;
      renderVoiceStudioGrid();
    }).catch(() => {
      $('voiceStudioStatus').textContent = '⚠️ Izin mikrofon belum aktif. Gunakan tombol 📂 untuk mengunggah file suara MP3/M4A.';
    });
  }

  // --------------------------------------------------------------------------
  // MODAL & INISIALISASI
  // --------------------------------------------------------------------------

  function startTrainGame(trainMode) {
    navigateTo('train');
    if (window.KeretaWush) {
      window.KeretaWush.start(trainMode);
    }
  }

  function showCustomModal(payload) {
    $('modalMascot').textContent = payload.mascot || '🏆';
    $('modalTitle').textContent = payload.title || 'Selesai!';
    $('modalSubtitle').textContent = payload.subtitle || '';
    $('modalScoreDetails').innerHTML = payload.detailsHtml || '';
    openModal();
  }

  function openModal() {
    $('resultModal').classList.remove('is-hidden');
  }

  function closeModal() {
    $('resultModal').classList.add('is-hidden');
  }

  function restartCurrentMode() {
    closeModal();
    if (currentView === 'single') startSinglePlayer();
    else if (currentView === 'boni') startBoniSingle();
    else if (currentView === 'multi') startMultiplayer(vsSubMode);
    else if (currentView === 'train') window.KeretaWush.restart();
    else navigateTo('menu');
  }

  function init() {
    $('brandHome').addEventListener('pointerdown', (e) => { e.preventDefault(); navigateTo('menu'); });
    $('btnHome').addEventListener('pointerdown', (e) => { e.preventDefault(); navigateTo('menu'); });
    $('btnAudioToggle').addEventListener('pointerdown', (e) => { e.preventDefault(); AudioFX.toggleSound(); updateAudioButtons(); });
    $('btnBgmToggle').addEventListener('pointerdown', (e) => { e.preventDefault(); AudioFX.toggleBgm(); updateAudioButtons(); });
    $('btnFullscreen').addEventListener('click', toggleFullscreen);

    $('btnTestVoice').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioFX.speakIndonesianText('Halo anak-anak hebat! Selamat belajar huruf bersama Ibu Guru dan Boni!', null);
    });
    $('btnOpenVoiceStudio').addEventListener('click', openVoiceStudio);
    $('btnCloseVoiceStudio').addEventListener('click', closeVoiceStudio);

    $('idVoiceSelect').addEventListener('change', (e) => {
      AudioFX.setPreferredVoice(e.target.value);
      AudioFX.speakIndonesianText('Halo anak-anak, ini adalah suara Bahasa Indonesia yang dipilih.', null);
    });

    $('menuCardLearn').addEventListener('pointerdown', (e) => { e.preventDefault(); navigateTo('learn'); });
    $('menuCardSingle').addEventListener('pointerdown', (e) => { e.preventDefault(); startSinglePlayer(); });
    $('menuCardBoni').addEventListener('pointerdown', (e) => { e.preventDefault(); startBoniSingle(); });
    $('btnMenuVsCards').addEventListener('pointerdown', (e) => { e.preventDefault(); startMultiplayer('cards'); });
    $('btnMenuVsBoni').addEventListener('pointerdown', (e) => { e.preventDefault(); startMultiplayer('boni'); });
    $('menuCardTrain').addEventListener('pointerdown', (e) => { e.preventDefault(); startTrainGame('solo'); });
    $('btnMenuVsTrain').addEventListener('pointerdown', (e) => { e.preventDefault(); startTrainGame('vs'); });
    $('tabVsTrain').addEventListener('pointerdown', (e) => { e.preventDefault(); startTrainGame('vs'); });
    if (window.KeretaWush) {
      window.KeretaWush.bindControls();
      window.KeretaWush.setModalHandler(showCustomModal);
    }

    $('btnReplayPhonic').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (currentSelectedPhonic) AudioFX.speakLetterPrompt(currentSelectedPhonic, 'learn');
    });
    $('spotlightEmoji').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (currentSelectedPhonic) AudioFX.speakLetterPrompt(currentSelectedPhonic, 'learn');
    });
    $('btnTeacherGuide').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioFX.speakIndonesianText('Halo anak-anak pintar! Sentuh salah satu huruf untuk mendengar pelafalannya ya!', null);
    });

    $('btnReplayQuestionSp').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (spQuestion) AudioFX.speakLetterPrompt(spQuestion.target, 'quiz');
    });
    $('btnReplayQuestionBoni').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (boniTarget) AudioFX.speakLetterPrompt(boniTarget, 'balloon');
    });

    $('tabVsCards').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (vsSubMode !== 'cards') startMultiplayer('cards');
    });
    $('tabVsBoni').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (vsSubMode !== 'boni') startMultiplayer('boni');
    });
    $('btnReplayQuestionMp').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (vsTarget) AudioFX.speakLetterPrompt(vsTarget, vsSubMode === 'boni' ? 'balloon' : 'quiz');
    });

    $('modalBtnPlayAgain').addEventListener('pointerdown', (e) => { e.preventDefault(); restartCurrentMode(); });
    $('modalBtnMenu').addEventListener('pointerdown', (e) => { e.preventDefault(); navigateTo('menu'); });

    ['auto', 'online', 'offline'].forEach(modeKey => {
      const btn = $('btnAudioMode_' + modeKey);
      if (btn) {
        btn.addEventListener('click', () => {
          AudioFX.setAudioMode(modeKey);
          updateAudioModeButtons();
          AudioFX.speakIndonesianText('Mode suara diperbarui. Halo anak-anak hebat!', null);
        });
      }
    });

    $('btnExportVoicePack').addEventListener('click', () => {
      AudioFX.exportVoicePackJSON().then(jsonStr => {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'paket_suara_guru_alfabet_ceria.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        $('voiceStudioStatus').textContent = '✅ Paket suara guru berhasil diunduh (.json)!';
      });
    });

    $('inputImportVoicePack').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        AudioFX.importVoicePackJSON(reader.result).then(count => {
          $('voiceStudioStatus').textContent = `✅ Berhasil mengimpor ${count} rekaman suara guru!`;
          renderVoiceStudioGrid();
        }).catch(() => {
          $('voiceStudioStatus').textContent = '⚠️ File paket suara tidak valid.';
        });
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    $('btnForceLandscape').addEventListener('click', forceLandscapeMode);

    updateAudioButtons();
    updateAudioModeButtons();
    updateFullscreenButton();
    checkPortraitOrientation();
    AudioFX.onVoiceStatusChange(updateVoiceBadge);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
