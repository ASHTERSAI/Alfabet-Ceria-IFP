/* ==========================================================================
   MODUL GAME: KERETA CEPAT WUSH (SOLO VS ROBOT & MODE ADU / VS 2 PEMAIN)
   - Multi-Touch Drag & Drop berbasis Pointer Events (pointerId) untuk IFP 75"
   - Mendukung juga Tap-Pilih + Tap-Slot untuk anak Kelas 1 SD
   - Animasi Anak SD Berseragam Merah Putih Menangis untuk pihak yang kalah
   ========================================================================== */
window.KeretaWush = (function () {
  const DATA = window.ALPHABET_DATA;
  const AudioFX = window.AlfabetAudio;
  const Confetti = window.AlfabetConfetti;

  const CARRIAGE_COLORS = [
    { bg: '#EF4444', border: '#991B1B' },
    { bg: '#F97316', border: '#9A3412' },
    { bg: '#EAB308', border: '#A16207' },
    { bg: '#10B981', border: '#065F46' },
    { bg: '#0EA5E9', border: '#0369A1' },
    { bg: '#6366F1', border: '#3730A3' },
    { bg: '#A855F7', border: '#6B21A8' },
    { bg: '#EC4899', border: '#9D174D' }
  ];

  let mode = 'solo';          // 'solo' | 'vs'
  let soloCount = 26;         // 8 | 14 | 26 (default A-Z sesuai desain)
  let vsCount = 8;            // 6 | 8 | 10 gerbong per pemain (Bank Abjad = 2x)
  let robotSpeed = 'normal';  // 'slow' | 'normal' | 'fast'

  let targetItems = [];
  let p1Placed = 0;
  let p2Placed = 0;
  let totalTarget = 26;
  let raceEnded = false;

  let robotTimer = null;
  let activeDrags = new Map(); // pointerId -> dragState (True Multi-Touch!)
  let selectedCarriage = null; // Fallback tap-to-place

  let openResultModalCb = null;

  const $ = (id) => document.getElementById(id);

  function setModalHandler(cb) {
    openResultModalCb = cb;
  }

  function stop() {
    if (robotTimer) {
      clearInterval(robotTimer);
      robotTimer = null;
    }
    clearAllDrags();
    selectedCarriage = null;
  }

  function clearAllDrags() {
    activeDrags.forEach((d) => {
      if (d.ghostEl && d.ghostEl.parentNode) d.ghostEl.parentNode.removeChild(d.ghostEl);
      if (d.bankEl) d.bankEl.classList.remove('is-dragging');
      if (d.hoveredSlot) d.hoveredSlot.classList.remove('is-drop-hover');
    });
    activeDrags.clear();
  }

  function start(newMode) {
    if (newMode) mode = newMode;
    stop();
    raceEnded = false;
    p1Placed = 0;
    p2Placed = 0;

    updateToolbarUI();
    buildRaceData();
    renderWorkspace();
    updateTrainPositions(false);

    AudioFX.playTrainStart();
    if (mode === 'solo') {
      AudioFX.speakIndonesianText('Kereta Cepat Wush! Ayo tarik gerbong huruf ke tempat yang benar sebelum robot sampai finis!', null);
      startRobotLoop();
    } else {
      AudioFX.speakIndonesianText('Adu Kereta Cepat Wush! Tarik gerbong dari bank abjad tengah ke keretamu secepat mungkin!', null);
    }
  }

  function updateToolbarUI() {
    $('tabTrainSolo').classList.toggle('is-active', mode === 'solo');
    $('tabTrainVs').classList.toggle('is-active', mode === 'vs');

    // Tampilkan pilihan jumlah gerbong sesuai mode
    const countBox = $('trainCountSwitch');
    countBox.innerHTML = '';
    const options = mode === 'solo'
      ? [{ n: 8, label: '8 Huruf' }, { n: 14, label: '14 Huruf' }, { n: 26, label: 'A–Z (26)' }]
      : [{ n: 6, label: '6 Gerbong' }, { n: 8, label: '8 Gerbong' }, { n: 10, label: '10 Gerbong' }];

    const currentN = mode === 'solo' ? soloCount : vsCount;
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'train-tab' + (opt.n === currentN ? ' is-active-blue' : '');
      btn.textContent = opt.label;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        AudioFX.playClick();
        if (mode === 'solo') soloCount = opt.n;
        else vsCount = opt.n;
        start(mode);
      });
      countBox.appendChild(btn);
    });

    // Pengaturan kecepatan robot hanya muncul di mode 1 Pemain
    $('trainRobotSpeedWrap').classList.toggle('is-hidden', mode !== 'solo');
    ['slow', 'normal', 'fast'].forEach(sp => {
      const btn = $('btnRobot_' + sp);
      if (btn) btn.classList.toggle('is-active', robotSpeed === sp);
    });

    // Label rel atas & bawah
    $('trainLane1Tag').innerHTML = `🐰 Pemain 1 <span id="trainLane1Prog">(0 / ${mode === 'solo' ? soloCount : vsCount})</span>`;
    if (mode === 'solo') {
      $('trainLane2Tag').innerHTML = `🤖 Robot Wush <span id="trainLane2Prog">(0 / ${soloCount})</span>`;
    } else {
      $('trainLane2Tag').innerHTML = `🐱 Pemain 2 <span id="trainLane2Prog">(0 / ${vsCount})</span>`;
    }
  }

  function buildRaceData() {
    totalTarget = mode === 'solo' ? soloCount : vsCount;
    if (totalTarget === 26) {
      targetItems = [...DATA];
    } else {
      // Ambil urutan huruf berurutan dari awal yang acak (mis. A..H atau acak terurut alfabet)
      // Untuk Kelas 1 SD, huruf berurutan alfabet (A-H atau potongan berurutan) paling mudah dipahami!
      const maxStart = DATA.length - totalTarget;
      const startIdx = Math.random() < 0.65 ? 0 : Math.floor(Math.random() * (maxStart + 1));
      targetItems = DATA.slice(startIdx, startIdx + totalTarget);
    }
  }

  function renderWorkspace() {
    const ws = $('trainLowerWorkspace');
    ws.classList.toggle('is-solo', mode === 'solo');
    ws.classList.toggle('is-vs', mode === 'vs');

    const boxP2 = $('trainBoxP2');
    boxP2.classList.toggle('is-hidden', mode !== 'vs');

    // Atur urutan DOM:
    // Solo: [P1, Bank Abjad]
    // VS  : [P1, Bank Abjad, P2] (urutan HTML sudah P1, Bank, P2!)
    $('trainP1Title').textContent = mode === 'solo' ? '🐰 PLAYER MURID 1' : '🐰 PLAYER MURID 1 (KIRI)';
    $('trainBankTitle').textContent = mode === 'solo' ? '📦 BANK ABJAD (Tarik ke Kiri ⬅️)' : '📦 BANK ABJAD (Tengah)';
    $('trainP2Title').textContent = '🐱 PLAYER MURID 2 (KANAN)';

    $('trainP1Counter').textContent = `0 / ${totalTarget}`;
    $('trainP2Counter').textContent = `0 / ${totalTarget}`;

    renderPlayerSlots($('trainP1Slots'), 1);
    if (mode === 'vs') {
      renderPlayerSlots($('trainP2Slots'), 2);
    }
    renderBankAbjad($('trainBankGrid'));
  }

  function getSlotGridDimensions(count, isSolo) {
    if (isSolo) {
      if (count === 26) return { cols: 7, rows: 4, dense: true };
      if (count === 14) return { cols: 5, rows: 3, dense: false };
      return { cols: 4, rows: 2, dense: false };
    } else {
      if (count === 10) return { cols: 5, rows: 2, dense: true };
      if (count === 8) return { cols: 4, rows: 2, dense: false };
      return { cols: 3, rows: 2, dense: false };
    }
  }

  function renderPlayerSlots(gridEl, playerNum) {
    gridEl.innerHTML = '';
    const dims = getSlotGridDimensions(totalTarget, mode === 'solo');
    gridEl.style.gridTemplateColumns = `repeat(${dims.cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${dims.rows}, 1fr)`;
    gridEl.classList.toggle('is-dense', dims.dense);

    // Jika mode Solo 26 huruf (A-Z) atau 14 huruf, sisipkan ikon mini Lokomotif di pojok kiri atas (seperti gambar lampiran!)
    if (mode === 'solo' && (totalTarget === 26 || totalTarget === 14)) {
      const loco = document.createElement('div');
      loco.className = 'train-slot-loco';
      loco.innerHTML = '🚂<span>LOKO</span>';
      gridEl.appendChild(loco);
    }

    targetItems.forEach((item) => {
      const slot = document.createElement('div');
      slot.className = `train-slot train-slot-p${playerNum}`;
      slot.dataset.letter = item.letter;
      slot.dataset.player = String(playerNum);
      slot.dataset.filled = '0';
      slot.innerHTML = `
        <span class="train-slot-letter">${item.letter}</span>
        <span class="train-slot-sub">${item.letter.toLowerCase()}</span>
      `;

      // Fallback Tap-to-Place: jika siswa sudah mengetuk gerbong di Bank Abjad, lalu mengetuk slot ini
      slot.addEventListener('pointerdown', (e) => {
        if (!selectedCarriage || raceEnded) return;
        e.preventDefault();
        attemptPlaceCarriage(selectedCarriage.item, selectedCarriage.bankEl, slot);
        if (selectedCarriage && selectedCarriage.bankEl) {
          selectedCarriage.bankEl.classList.remove('is-selected');
        }
        selectedCarriage = null;
      });

      gridEl.appendChild(slot);
    });
  }

  function renderBankAbjad(gridEl) {
    gridEl.innerHTML = '';

    // Mode Solo: 1 set gerbong acak. Mode VS: 2 set gerbong (sejumlah gerbong kiri + kanan) diacak!
    let pool = [];
    if (mode === 'solo') {
      pool = targetItems.map((item, idx) => ({ item, color: CARRIAGE_COLORS[idx % CARRIAGE_COLORS.length] }));
    } else {
      targetItems.forEach((item, idx) => {
        const c1 = CARRIAGE_COLORS[idx % CARRIAGE_COLORS.length];
        const c2 = CARRIAGE_COLORS[(idx + 3) % CARRIAGE_COLORS.length];
        pool.push({ item, color: c1 });
        pool.push({ item, color: c2 });
      });
    }

    // Acak urutan gerbong di Bank Abjad
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const totalBank = pool.length;
    let cols = 4, rows = 4, dense = false;
    if (mode === 'solo') {
      if (totalBank === 26) { cols = 7; rows = 4; dense = true; }
      else if (totalBank === 14) { cols = 5; rows = 3; dense = false; }
      else { cols = 4; rows = 2; dense = false; }
    } else {
      if (totalBank === 20) { cols = 5; rows = 4; dense = true; }
      else if (totalBank === 16) { cols = 4; rows = 4; dense = false; }
      else { cols = 4; rows = 3; dense = false; }
    }

    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    gridEl.classList.toggle('is-dense', dense);
    $('trainBankCounter').textContent = `${totalBank} Gerbong`;

    pool.forEach((entry) => {
      const btn = document.createElement('div');
      btn.className = 'bank-carriage';
      btn.style.backgroundColor = entry.color.bg;
      btn.style.borderColor = entry.color.border;
      btn.dataset.letter = entry.item.letter;
      btn.dataset.bg = entry.color.bg;
      btn.dataset.border = entry.color.border;
      btn.innerHTML = `
        <span class="carriage-letter">${entry.item.letter}</span>
        <span class="carriage-lower">${entry.item.letter.toLowerCase()}</span>
      `;

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (raceEnded || btn.classList.contains('is-used') || btn.classList.contains('is-dragging')) return;
        startMultiTouchDrag(e, entry.item, btn);
      });

      gridEl.appendChild(btn);
    });
  }

  // --------------------------------------------------------------------------
  // ENGINE DRAG & DROP MULTI-TOUCH (POINTER EVENTS BERBASIS pointerId)
  // --------------------------------------------------------------------------
  function startMultiTouchDrag(e, item, bankEl) {
    AudioFX.playClick();

    // Hapus seleksi tap lama jika mulai drag baru
    if (selectedCarriage && selectedCarriage.bankEl && selectedCarriage.bankEl !== bankEl) {
      selectedCarriage.bankEl.classList.remove('is-selected');
      selectedCarriage = null;
    }

    const rect = bankEl.getBoundingClientRect();
    const ghost = bankEl.cloneNode(true);
    ghost.classList.remove('is-selected', 'is-dragging');
    ghost.classList.add('carriage-ghost');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    document.body.appendChild(ghost);

    bankEl.classList.add('is-dragging');

    activeDrags.set(e.pointerId, {
      pointerId: e.pointerId,
      item,
      bankEl,
      ghostEl: ghost,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      hoveredSlot: null
    });
  }

  function findSlotAtPoint(x, y) {
    const offsets = [[0, 0], [-16, 0], [16, 0], [0, -16], [0, 16]];
    for (let k = 0; k < offsets.length; k++) {
      const els = document.elementsFromPoint(x + offsets[k][0], y + offsets[k][1]);
      for (let i = 0; i < els.length; i++) {
        const slot = els[i].closest ? els[i].closest('.train-slot') : null;
        if (slot && slot.dataset.filled === '0') {
          return slot;
        }
      }
    }
    return null;
  }

  document.addEventListener('pointermove', (e) => {
    const drag = activeDrags.get(e.pointerId);
    if (!drag) return;
    e.preventDefault();

    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) {
      drag.moved = true;
    }

    drag.ghostEl.style.left = e.clientX + 'px';
    drag.ghostEl.style.top = e.clientY + 'px';

    const slot = findSlotAtPoint(e.clientX, e.clientY);
    if (drag.hoveredSlot && drag.hoveredSlot !== slot) {
      drag.hoveredSlot.classList.remove('is-drop-hover');
    }
    if (slot) {
      slot.classList.add('is-drop-hover');
    }
    drag.hoveredSlot = slot;
  }, { passive: false });

  function finishDrag(e) {
    const drag = activeDrags.get(e.pointerId);
    if (!drag) return;
    activeDrags.delete(e.pointerId);

    if (drag.hoveredSlot) {
      drag.hoveredSlot.classList.remove('is-drop-hover');
    }
    if (drag.ghostEl && drag.ghostEl.parentNode) {
      drag.ghostEl.parentNode.removeChild(drag.ghostEl);
    }
    drag.bankEl.classList.remove('is-dragging');

    if (raceEnded) return;

    const dropSlot = findSlotAtPoint(e.clientX, e.clientY);
    if (dropSlot) {
      attemptPlaceCarriage(drag.item, drag.bankEl, dropSlot);
    } else if (!drag.moved) {
      // Quick tap fallback: tandai gerbong agar siswa bisa klik slot huruf tujuannya
      if (selectedCarriage && selectedCarriage.bankEl === drag.bankEl) {
        drag.bankEl.classList.remove('is-selected');
        selectedCarriage = null;
      } else {
        if (selectedCarriage && selectedCarriage.bankEl) {
          selectedCarriage.bankEl.classList.remove('is-selected');
        }
        drag.bankEl.classList.add('is-selected');
        selectedCarriage = { item: drag.item, bankEl: drag.bankEl };
      }
    }
  }

  document.addEventListener('pointerup', finishDrag);
  document.addEventListener('pointercancel', finishDrag);

  function attemptPlaceCarriage(item, bankEl, slotEl) {
    if (raceEnded || slotEl.dataset.filled === '1' || bankEl.classList.contains('is-used')) return;

    const targetLetter = slotEl.dataset.letter;
    const playerNum = parseInt(slotEl.dataset.player, 10);

    if (item.letter === targetLetter) {
      // BENAR! Pasang gerbong ke slot & lajukan kereta!
      slotEl.dataset.filled = '1';
      slotEl.classList.add('is-filled');
      slotEl.style.backgroundColor = bankEl.dataset.bg;
      slotEl.style.borderColor = bankEl.dataset.border;

      bankEl.classList.add('is-used');
      bankEl.classList.remove('is-selected', 'is-dragging');

      const remaining = $('trainBankGrid').querySelectorAll('.bank-carriage:not(.is-used)').length;
      $('trainBankCounter').textContent = `${remaining} Gerbong`;

      AudioFX.playTrainWhoosh();
      AudioFX.speakIndonesianText(item.ttsName, item.letter);

      const rect = slotEl.getBoundingClientRect();
      Confetti.fire({
        particleCount: 22,
        originX: (rect.left + rect.width * 0.5) / window.innerWidth,
        originY: (rect.top + rect.height * 0.5) / window.innerHeight,
        spread: 60
      });

      if (playerNum === 1) {
        p1Placed++;
        $('trainP1Counter').textContent = `${p1Placed} / ${totalTarget}`;
        triggerTrainZoom('trainRunner1');
      } else {
        p2Placed++;
        $('trainP2Counter').textContent = `${p2Placed} / ${totalTarget}`;
        triggerTrainZoom('trainRunner2');
      }

      updateTrainPositions(true);
      checkFinish();
    } else {
      // SALAH! Gerbong kembali ke Bank Abjad
      AudioFX.playWrong();
      slotEl.classList.remove('is-wrong-flash');
      void slotEl.offsetWidth;
      slotEl.classList.add('is-wrong-flash');
      setTimeout(() => slotEl.classList.remove('is-wrong-flash'), 420);
    }
  }

  function triggerTrainZoom(runnerId) {
    const el = $(runnerId);
    if (!el) return;
    el.classList.remove('is-zooming');
    void el.offsetWidth;
    el.classList.add('is-zooming');
  }

  function updateTrainPositions(animate) {
    const p1Prog = Math.min(1, p1Placed / totalTarget);
    const p2Prog = Math.min(1, p2Placed / totalTarget);

    // Posisi START = 80% (kanan), Posisi FINISH = 0% (tepat menyentuh gerbang FINISH di kiri)
    const p1Left = (80 * (1 - p1Prog)).toFixed(2) + '%';
    const p2Left = (80 * (1 - p2Prog)).toFixed(2) + '%';

    const r1 = $('trainRunner1');
    const r2 = $('trainRunner2');
    if (!animate) {
      r1.style.transition = 'none';
      r2.style.transition = 'none';
      r1.style.left = p1Left;
      r2.style.left = p2Left;
      void r1.offsetWidth;
      r1.style.transition = '';
      r2.style.transition = '';
    } else {
      r1.style.left = p1Left;
      r2.style.left = p2Left;
    }

    const prog1El = $('trainLane1Prog');
    const prog2El = $('trainLane2Prog');
    if (prog1El) prog1El.textContent = `(${p1Placed} / ${totalTarget})`;
    if (prog2El) prog2El.textContent = `(${p2Placed} / ${totalTarget})`;
  }

  // --------------------------------------------------------------------------
  // LOGIKA KERETA ROBOT (MODE 1 PEMAIN)
  // --------------------------------------------------------------------------
  function startRobotLoop() {
    if (robotTimer) clearInterval(robotTimer);
    // Jeda langkah robot disesuaikan agar seru dan tetap bisa dikalahkan anak Kelas 1 SD
    const intervalMs = robotSpeed === 'slow' ? 5200 : (robotSpeed === 'fast' ? 2400 : 3700);

    robotTimer = setInterval(() => {
      if (raceEnded || mode !== 'solo') {
        clearInterval(robotTimer);
        robotTimer = null;
        return;
      }
      if (p2Placed < totalTarget) {
        p2Placed++;
        triggerTrainZoom('trainRunner2');
        updateTrainPositions(true);
        checkFinish();
      }
    }, intervalMs);
  }

  // --------------------------------------------------------------------------
  // CEK GARIS FINISH & TAMPILKAN HASIL (DENGAN ANIMASI ANAK SD MENANGIS)
  // --------------------------------------------------------------------------
  function checkFinish() {
    if (raceEnded) return;
    if (p1Placed < totalTarget && p2Placed < totalTarget) return;

    raceEnded = true;
    stop();

    const p1Won = p1Placed >= totalTarget;

    if (mode === 'solo') {
      if (p1Won) {
        AudioFX.playVictory();
        Confetti.fire({ particleCount: 140, originX: 0.5, originY: 0.5, spread: 120 });
        if (openResultModalCb) {
          openResultModalCb({
            mascot: '🏆',
            title: '🚆 Wush! Kamu Menang!',
            subtitle: `Kereta Pemain 1 berhasil mengalahkan Robot Wush (${totalTarget} Gerbong)!`,
            detailsHtml: `
              <div class="vs-result-arena">
                <div class="vs-result-card is-winner">
                  <span class="vs-role-tag tag-win">👑 JUARA 1</span>
                  <img src="assets/sd_happy.svg" alt="Siswa SD Menang" class="vs-sd-avatar">
                  <strong class="vs-player-title text-blue">Pemain Murid 1</strong>
                  <span class="vs-player-pts text-blue">${p1Placed} / ${totalTarget} Gerbong</span>
                </div>
                <div class="vs-result-card is-loser">
                  <span class="vs-role-tag tag-lose">🤖 KALAH</span>
                  <div style="font-size:calc(10 * var(--u));line-height:1.4;">🤖</div>
                  <strong class="vs-player-title text-amber">Robot Wush</strong>
                  <span class="vs-player-pts text-amber">${p2Placed} / ${totalTarget} Gerbong</span>
                </div>
              </div>
              <p class="modal-tip">Hebat sekali! Kamu sangat cepat menyusun gerbong alfabet!</p>
            `
          });
        }
        AudioFX.speakIndonesianText('Hore! Kereta kamu sampai finis duluan! Kamu mengalahkan robot wush!', null);
      } else {
        AudioFX.playCrySound();
        if (openResultModalCb) {
          openResultModalCb({
            mascot: '🤖',
            title: 'Robot Wush Sampai Duluan!',
            subtitle: 'Kereta Robot melewati garis FINISH lebih cepat kali ini.',
            detailsHtml: `
              <div class="vs-result-arena">
                <div class="vs-result-card is-loser">
                  <span class="vs-role-tag tag-lose">😭 KALAH</span>
                  <img src="assets/sd_crying.svg" alt="Anak SD Pakai Baju SD Menangis" class="vs-sd-avatar">
                  <strong class="vs-player-title text-blue">Pemain Murid 1 Menangis</strong>
                  <span class="vs-player-pts text-blue">${p1Placed} / ${totalTarget} Gerbong</span>
                </div>
                <div class="vs-result-card is-winner">
                  <span class="vs-role-tag tag-win">🏁 FINISH DULUAN</span>
                  <div style="font-size:calc(10 * var(--u));line-height:1.4;">🤖</div>
                  <strong class="vs-player-title text-amber">Robot Wush</strong>
                  <span class="vs-player-pts text-amber">${p2Placed} / ${totalTarget} Gerbong</span>
                </div>
              </div>
              <p class="modal-tip">Jangan menangis ya! Ayo balapan ulang dan susun gerbong lebih cepat!</p>
            `
          });
        }
        AudioFX.speakIndonesianText('Yah, robot wush sampai finis duluan. Jangan menangis ya, ayo balapan lagi!', null);
      }
    } else {
      // MODE VS (2 PEMAIN) -> YANG KALAH MENAMPILKAN ANIMASI ANAK SD MENANGIS
      const winnerNum = p1Won ? 1 : 2;
      const loserNum = p1Won ? 2 : 1;
      const winCount = p1Won ? p1Placed : p2Placed;
      const loseCount = p1Won ? p2Placed : p1Placed;
      const winColor = winnerNum === 1 ? 'text-blue' : 'text-amber';
      const loseColor = loserNum === 1 ? 'text-blue' : 'text-amber';

      AudioFX.playVictory();
      setTimeout(() => AudioFX.playCrySound(), 650);
      Confetti.fire({ particleCount: 150, originX: 0.5, originY: 0.5, spread: 120 });

      if (openResultModalCb) {
        openResultModalCb({
          mascot: '🏁',
          title: `🏆 Kereta Pemain ${winnerNum} Juara!`,
          subtitle: `Pemain ${winnerNum} berhasil menyusun semua gerbong & sampai FINISH duluan!`,
          detailsHtml: `
            <div class="vs-result-arena">
              <div class="vs-result-card is-winner">
                <span class="vs-role-tag tag-win">👑 PEMENANG</span>
                <img src="assets/sd_happy.svg" alt="Siswa SD Menang" class="vs-sd-avatar">
                <strong class="vs-player-title ${winColor}">Pemain ${winnerNum}</strong>
                <span class="vs-player-pts ${winColor}">${winCount} / ${totalTarget} Gerbong</span>
              </div>

              <div class="vs-result-card is-loser">
                <span class="vs-role-tag tag-lose">😭 KALAH</span>
                <img src="assets/sd_crying.svg" alt="Anak SD Pakai Baju SD Menangis" class="vs-sd-avatar">
                <strong class="vs-player-title ${loseColor}">Pemain ${loserNum} Menangis</strong>
                <span class="vs-player-pts ${loseColor}">${loseCount} / ${totalTarget} Gerbong</span>
              </div>
            </div>
            <p class="modal-tip">Jangan bersedih ya Pemain ${loserNum}, ayo tanding ulang Kereta Cepat Wush!</p>
          `
        });
      }
      AudioFX.speakIndonesianText(`Hore! Kereta Pemain ${winnerNum} sampai finis duluan! Pemain ${loserNum} jangan menangis ya, ayo tanding lagi!`, null);
    }
  }

  function bindControls() {
    $('tabTrainSolo').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioFX.playClick();
      start('solo');
    });
    $('tabTrainVs').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioFX.playClick();
      start('vs');
    });
    $('btnTrainReset').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioFX.playClick();
      start(mode);
    });

    ['slow', 'normal', 'fast'].forEach(sp => {
      $('btnRobot_' + sp).addEventListener('pointerdown', (e) => {
        e.preventDefault();
        AudioFX.playClick();
        robotSpeed = sp;
        start('solo');
      });
    });
  }

  return {
    start,
    stop,
    restart: () => start(mode),
    bindControls,
    setModalHandler
  };
})();
