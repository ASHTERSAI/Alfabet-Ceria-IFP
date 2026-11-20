/* ==========================================================================
   EFEK KONFETI CANVAS RINGAN (100% Offline, Non-Blocking, Anti-Scroll)
   ========================================================================== */
window.AlfabetConfetti = (function () {
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#FACC15'];
  let canvas = null;
  let ctx = null;
  let particles = [];
  let rafId = null;

  function ensureCanvas() {
    if (!canvas) {
      canvas = document.getElementById('confettiCanvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confettiCanvas';
        canvas.className = 'confetti-canvas';
        document.body.appendChild(canvas);
      }
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);
    }
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function fire(options) {
    ensureCanvas();
    const opts = Object.assign({
      particleCount: 55,
      originX: 0.5,
      originY: 0.65,
      spread: 80
    }, options || {});

    const startX = canvas.width * opts.originX;
    const startY = canvas.height * opts.originY;
    const spreadRad = (opts.spread * Math.PI) / 180;

    for (let i = 0; i < opts.particleCount; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadRad;
      const speed = 7 + Math.random() * 11;
      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 70 + Math.random() * 45,
        shape: i % 3 === 0 ? 'circle' : 'rect'
      });
    }

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.vx *= 0.985;
      p.rot += p.vRot;
      p.life++;

      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
      }
      ctx.restore();

      if (p.life >= p.maxLife || p.y > canvas.height + 30) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      rafId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafId = null;
    }
  }

  return { fire };
})();
