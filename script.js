// script.js - Live overlay logic (OPCIÓN A)
// Author: generated for Manuel (adjustable)

(() => {
  // Elements
  const videoEl = document.getElementById('camVideo');
  const canvas = document.getElementById('overlayCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  const btnRec = document.getElementById('btn-rec');
  const btnSwitch = document.getElementById('btn-switch');
  const liveImg = document.getElementById('live-icon-img');
  const liveContainer = document.getElementById('top-right');

  const viewersCountEl = document.getElementById('viewers-count');

  // Config & state
  let usingFront = false; // start with rear camera by default (we'll request environment)
  let cameraStream = null;   // current camera MediaStream (video)
  let micStream = null;      // microphone MediaStream (audio)
  let mediaRecorder = null;
  let recordedChunks = [];
  let canvasStream = null;
  let mixedStream = null;
  let recording = false;
  let blinkInterval = null;
  let viewerCount = 50604; // starting example number
  const comments = []; // visible comments
  const MAX_COMMENTS = 5;

  // Canvas sizing helper
  function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  // Start camera (without stopping recorder). Using facingMode.
  async function startCamera(useFront) {
    // stop previous video tracks (but leave mic)
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }

    // Choose constraint. Prefer environment (rear) by default.
    const constraints = {
      audio: false, // microphone handled separately
      video: {
        width: { ideal: 1280 },
        height: { ideal: 1920 },
        facingMode: useFront ? 'user' : { ideal: 'environment' }
      }
    };

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      // feed into hidden video
      videoEl.srcObject = cameraStream;
      // Make sure video plays (some browsers require play() promise)
      await videoEl.play();
    } catch (err) {
      console.error('Camera error', err);
      alert('Error accediendo a la cámara. Comprueba permisos.');
    }
  }

  // Get microphone once (persistent)
  async function ensureMic() {
    if (!micStream) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        // Do NOT attach micStream to any audio element — that'll cause echo.
        // We'll combine micStream audio track(s) with canvas's video track when recording.
      } catch (err) {
        console.warn('No microphone access', err);
        micStream = null;
      }
    }
  }

  // Canvas drawing: video + overlays (viewers, comments, live icon)
  function drawLoop() {
    resizeCanvasToDisplaySize();
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0,0,w,h);

    // draw camera frame (cover mode)
    if (videoEl && videoEl.readyState >= 2) {
      // compute cover fit
      const videoRatio = videoEl.videoWidth / Math.max(1, videoEl.videoHeight);
      const canvasRatio = w / h;
      let drawW = w, drawH = h, offsetX = 0, offsetY = 0;
      if (videoRatio > canvasRatio) {
        // video is wider => crop sides
        drawH = h;
        drawW = Math.round(h * videoRatio);
        offsetX = Math.round((w - drawW)/2);
      } else {
        // video taller => crop top/bottom
        drawW = w;
        drawH = Math.round(w / videoRatio);
        offsetY = Math.round((h - drawH)/2);
      }
      ctx.drawImage(videoEl, offsetX, offsetY, drawW, drawH);
    } else {
      // black background until video ready
      ctx.fillStyle = 'black';
      ctx.fillRect(0,0,w,h);
    }

    // -------- OVERLAYS drawn to match screenshot proportions --------
    // We'll work in canvas pixels; scale positions using w/h.

    // Top-left user icon
    const iconSize = Math.round(Math.min(w, h) * 0.07); // ~54px on typical phone
    const marginLeft = Math.round(w * 0.02); // small left margin
    const marginTop = Math.round(h * 0.01); // small top margin

    // draw user icon from DOM image resource for crispness
    const imgUser = document.getElementById('icon-kalal');
    if (imgUser && imgUser.complete) {
      // Draw circular icon
      const xIcon = marginLeft;
      const yIcon = marginTop;
      // circle clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(xIcon + iconSize/2, yIcon + iconSize/2, iconSize/2, 0, Math.PI*2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(imgUser, xIcon, yIcon, iconSize, iconSize);
      ctx.restore();
    }

    // username text (we're using icon-only approach visually but keep text small)
    // The user wanted only the icon to show the username; we show small label for fallback
    const nameX = marginLeft + iconSize + Math.round(w * 0.02);
    const nameY = marginTop + Math.round(iconSize * 0.45);
    ctx.font = `${Math.round(h*0.03)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 8;
    ctx.fillText('KALAL_Y', nameX, nameY);

    // viewers row: eye icon + number
    const eyeImg = document.getElementById('eye-icon');
    const eyeSize = Math.round(Math.min(w,h) * 0.04); // ~28px
    const viewersY = nameY + Math.round(h*0.055); // slightly below username
    const eyeX = marginLeft + 2; // keep left aligned with user icon

    if (eyeImg && eyeImg.complete) {
      ctx.drawImage(eyeImg, eyeX, viewersY - eyeSize/2, eyeSize, eyeSize);
    }
    // viewers text
    ctx.font = `${Math.round(h*0.035)}px "Helvetica Neue", Arial, sans-serif`; // tuned smaller
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'middle';
    ctx.fillText(viewerCount.toLocaleString() + ' viewers', eyeX + eyeSize + Math.round(w*0.015), viewersY);

    // LIVE icon (drawn when recording AND blink toggle true)
    // We'll use the liveImg DOM icon for visuals
    if (recording && liveBlinkState) {
      if (liveImg && liveImg.complete) {
        // position: top-right, minimal margins
        const liveW = Math.round(w*0.22); // ~170px typical
        const liveH = Math.round(h*0.06);  // ~54px
        const xLive = w - liveW - 6; // 1px margin requested, a little safe
        const yLive = 6;             // 1px top margin
        ctx.drawImage(liveImg, xLive, yLive, liveW, liveH);
      }
    }

    // COMMENTS (left column) - draw bottom-up
    // comments[] is newest last -> we display newest at bottom, previous above
    const commentLeft = Math.round(w*0.04);
    let startY = Math.round(h*0.72); // place comments above controls
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 12;
    const commentFontSize = Math.round(h*0.055); // tuned; adjust if too big
    ctx.font = `bold ${commentFontSize}px "Helvetica Neue", Arial, sans-serif`;
    for (let i = comments.length-1; i >= 0; i--) {
      const c = comments[i];
      // draw the text line
      ctx.fillStyle = 'white';
      ctx.fillText(`${c.user}: ${c.text}`, commentLeft, startY);
      startY -= Math.round(commentFontSize * 1.1); // spacing between lines
    }

    // Request next animation frame
    requestAnimationFrame(drawLoop);
  }

  // Live blink toggler
  let liveBlinkState = true;
  let liveBlinkTimer = null;
  function startLiveBlink() {
    stopLiveBlink();
    liveImg.classList.add('blinking');
    // Also toggle a boolean used by canvas drawing for extra sync
    liveBlinkTimer = setInterval(() => {
      liveBlinkState = !liveBlinkState;
    }, 700);
  }
  function stopLiveBlink() {
    if (liveBlinkTimer) { clearInterval(liveBlinkTimer); liveBlinkTimer = null; }
    liveImg.classList.remove('blinking');
    liveBlinkState = true;
  }

  // start recording: attach canvas stream + mic tracks
  function startRecording() {
    if (recording) return;
    recordedChunks = [];

    // Ensure microphone available before creating recorder
    ensureMic().then(() => {
      canvasStream = canvas.captureStream(30); // 30 fps
      // Compose mixed stream: video from canvas + audio from mic (if exists)
      mixedStream = new MediaStream();

      // add video tracks
      canvasStream.getVideoTracks().forEach(t => mixedStream.addTrack(t));
      // add audio tracks from mic if present
      if (micStream) {
        micStream.getAudioTracks().forEach(t => mixedStream.addTrack(t));
      }

      // Choose MIME - webm for broad support
      const mime = (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' :
                    (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' :
                    'video/webm'));

      try {
        mediaRecorder = new MediaRecorder(mixedStream, { mimeType: mime });
      } catch (err) {
        console.error('MediaRecorder creation failed:', err);
        alert('No es posible iniciar la grabación (MediaRecorder).');
        return;
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // on stop, combine chunks and trigger download
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.getElementById('downloadAnchor');
        a.href = url;
        // file extension from mime (webm)
        a.download = 'stream_recording.webm';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      };

      mediaRecorder.start(1000); // optional timeslice
      recording = true;
      // visual effects
      startLiveBlink();
      btnRec.classList.add('recording');
    }).catch(err => {
      console.warn('Mic ensure failed', err);
    });
  }

  // stop recording
  function stopRecording() {
    if (!recording) return;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    recording = false;
    stopLiveBlink();
    btnRec.classList.remove('recording');
  }

  // Toggle recording
  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // Switch camera (keeps recording running)
  async function switchCamera() {
    usingFront = !usingFront;
    await startCamera(usingFront);
    // No need to touch recorder: canvas keeps drawing videoEl frames
  }

  // Viewers count growth (exponential-ish)
  function startViewersGrowth() {
    setInterval(() => {
      viewerCount = Math.floor(viewerCount * 1.01 + Math.random()*10);
      // update DOM element that's used for initial display; canvas draws a separate representation
      if (viewersCountEl) viewersCountEl.textContent = viewerCount.toLocaleString() + ' viewers';
    }, 2500);
  }

  // Comments generator - Arabic supportive messages + some in English/Spanish occasionally
  const arabicNames = ['سيف', 'مروان', 'علي', 'كريم', 'هيثم', 'رائد', 'فاطمة', 'نورا', 'يوسف', 'ليلى'];
  const arabicMsgs = ['استمر', 'أنت بطل', 'عمل رائع', 'جميل جداً', 'ممتاز', 'لا تتوقف'];
  const otherMsgs = ['keep going', 'don\'t stop', 'you are amazing', 'sigue así'];

  function randomEmoji() {
    const roll = Math.random();
    if (roll < 0.2) return '🔥';
    if (roll < 0.45) return '👍';
    return '';
  }

  function pushRandomComment() {
    // 60-70% arabic supportive names+texts
    const name = arabicNames[Math.floor(Math.random()*arabicNames.length)];
    const textPool = Math.random() < 0.95 ? arabicMsgs : otherMsgs; // mostly arabic
    let text = textPool[Math.floor(Math.random()*textPool.length)];
    // Add emoji with ~40% chance
    if (Math.random() < 0.4) {
      const emoji = randomEmoji();
      if (emoji) text += ' ' + emoji;
    }
    comments.push({ user: name, text });
    // limit
    while (comments.length > MAX_COMMENTS) comments.shift();
  }

  // Start auto comments
  function startAutoComments() {
    pushRandomComment(); // initial
    setInterval(() => {
      pushRandomComment();
    }, 2200 + Math.floor(Math.random()*1200));
  }

  // UI wiring
  btnRec.addEventListener('click', () => {
    toggleRecording();
  });
  btnSwitch.addEventListener('click', () => {
    // switch camera while keeping recording active
    switchCamera();
  });
  // heart is just a placeholder (no animation required)
  document.getElementById('btn-heart').addEventListener('click', () => {
    // Optionally show a small animation on canvas (not required)
  });

  // On load: set canvas sizing and start camera + mic + loops
  async function init() {
    // set canvas size to match viewport
    function fit() {
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      resizeCanvasToDisplaySize();
    }
    window.addEventListener('resize', fit);
    fit();

    // Start camera (rear by default)
    await ensureMic();
    await startCamera(usingFront);
    // Start draw loop (this will show overlays)
    requestAnimationFrame(drawLoop);

    // Prepare capture stream for recording when needed (done in startRecording)
    startViewersGrowth();
    startAutoComments();
  }

  // Initialize
  init();

  // Expose some internals for debugging (optional)
  window._liveOverlay = {
    startRecording,
    stopRecording,
    toggleRecording,
    switchCamera,
    getRecordingState: () => recording
  };

})();
