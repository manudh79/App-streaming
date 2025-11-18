// script.js - Canvas export (Option A) - final version
(async function(){
  // DOM elements (match your index.html)
  const video = document.getElementById('video');             // hidden source video element
  const recordCanvas = document.getElementById('recordCanvas'); // hidden canvas
  const REC_BTN = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') /* fallback */;
  const recButton = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') ; // (not used if ID different)
  // Use the IDs we provided in index.html:
  const REC = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') 
  // But to be safe, pick the actual IDs from index: REC_BTN => 'REC_BTN' not present, use 'REC_BTN' from index? 
  // Instead, fetch buttons by the ones in index:
  const BTN_REC = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') ; // placeholder
  // To avoid ID problems below, we will get the elements by the IDs used in the index.html earlier:
  const REC_BTN_ID = document.getElementById('REC_BTN'); // if null, fallback to element with id 'REC_BTN' from index(should exist)
  // Actually use the IDs defined in index.html: REC_BTN, CAM_BTN, HEART_BTN
  const REC_BTN_REAL = document.getElementById('REC_BTN') || document.getElementById('REC_BTN');
  const CAM_BTN = document.getElementById('CAM_BTN');
  const HEART_BTN = document.getElementById('HEART_BTN');

  // UI elements used to draw on canvas
  const KALAL_ICON = document.getElementById('KALAL_ICON');
  const KALAL_NAME = document.getElementById('KALAL_NAME');
  const EYE_ICON = document.getElementById('EYE_ICON');
  const VIEWERS_TEXT = document.getElementById('VIEWERS_TEXT');
  const LIVE_IMG = document.getElementById('LIVE_IMG');
  const COMMENTS_UI = document.getElementById('COMMENTS_UI');
  const BOTTOM_ICONS = document.getElementById('BOTTOM_ICONS');

  // But the index used slightly different ids; to be robust, define fallbacks:
  const BUTTON_REC = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') || document.getElementById('REC_BTN') || document.getElementById('REC_BTN') || document.querySelector('#REC_BTN') || document.querySelector('#REC_BTN');
  // Simpler: use the ones in index.html earlier: IDs used there were: REC_BTN, CAM_BTN, HEART_BTN
  const BTN_REC = document.getElementById('REC_BTN');
  const BTN_CAM = document.getElementById('CAM_BTN');
  const BTN_HEART = document.getElementById('HEART_BTN');

  // For drawing references, also allow alternate ids used before:
  const ICON_USER = document.getElementById('KALAL_ICON') || document.getElementById('userIcon') || document.getElementById('icon-kalal') || document.getElementById('icon-user');
  const NAME_USER = document.getElementById('KALAL_NAME') || document.getElementById('username') || document.getElementById('kalal-name');
  const ICON_EYE = document.getElementById('EYE_ICON') || document.getElementById('eye-icon') || document.getElementById('icon-eye');
  const VIEWERS_DOM = document.getElementById('VIEWERS_TEXT') || document.getElementById('viewers') || document.getElementById('viewers-count') || document.getElementById('viewersCount');
  const LIVE_DOM_IMG = document.getElementById('LIVE_IMG') || document.getElementById('live-icon-img') || document.getElementById('liveIcon') || document.getElementById('live');
  const COMMENTS_DOM = document.getElementById('COMMENTS_UI') || document.getElementById('comments') || document.getElementById('comments-helper');
  const BTN_REC_DOM = document.getElementById('REC_BTN') || document.getElementById('REC_BTN') || document.getElementById('REC_BTN');
  const BTN_CAM_DOM = document.getElementById('CAM_BTN') || document.getElementById('camBtn') || document.getElementById('switchCam') || document.getElementById('cam-btn');
  const BTN_HEART_DOM = document.getElementById('HEART_BTN') || document.getElementById('HEART_BTN') || document.getElementById('btn-heart');

  // Use robust references:
  const btnRec = BTN_REC_DOM || document.querySelector('#REC_BTN') || document.querySelector('button[title="Record"]') || document.querySelector('.rec, .control.rec, #recBtn');
  const btnCam = BTN_CAM_DOM || document.querySelector('#CAM_BTN') || document.querySelector('#camBtn') || document.querySelector('.cam, #switchCam');
  const btnHeart = BTN_HEART_DOM || document.querySelector('#HEART_BTN') || document.querySelector('#heartBtn');

  // final DOM refs for draw:
  const imgUserEl = ICON_USER;
  const nameUserEl = NAME_USER;
  const imgEyeEl = ICON_EYE;
  const viewersEl = VIEWERS_DOM;
  const liveImgEl = LIVE_DOM_IMG;
  const commentsEl = COMMENTS_DOM;
  const bottomIconsEl = BOTTOM_ICONS || document.getElementById('BOTTOM_ICONS') || document.getElementById('controls');

  // State
  let usingFront = false;            // default rear camera
  let cameraStream = null;
  let micStream = null;
  let isRecording = false;
  let mediaRecorder = null;
  let recordedChunks = [];
  let canvasStream = null;
  let mixedStream = null;
  let raf = null;
  let liveBlink = true;

  // Comments generation (arabic supportive)
  const arabicNames = ['سيف','رائد','مروان','علي','كريم','هيثم','يوسف','ليلى'];
  const arabicMsgs = ['استمر','عمل رائع','ممتاز','جميل جدا','لا تتوقف'];
  const emojis = ['🔥','👍'];
  const commentsBuffer = [];

  function pushComment() {
    const name = arabicNames[Math.floor(Math.random()*arabicNames.length)];
    const msg = arabicMsgs[Math.floor(Math.random()*arabicMsgs.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*emojis.length)] : '';
    const text = `${name}: ${msg} ${emoji}`.trim();
    commentsBuffer.push(text);
    if (commentsBuffer.length > 6) commentsBuffer.shift();
    // update visual DOM comments if exists
    if (commentsEl) {
      commentsEl.innerHTML = '';
      for (let i = commentsBuffer.length-1;i>=0;i--){
        const d = document.createElement('div');
        d.className = 'comment';
        d.textContent = commentsBuffer[i];
        commentsEl.appendChild(d);
      }
    }
  }
  setInterval(pushComment, 2200);

  // Helpers: get position/size of UI element relative to viewport
  function getRect(el) {
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  // Start camera (video + audio permission), but we won't play mic audio to avoid echo
  async function startCamera(front=false) {
    // stop previous camera tracks (but keep mic stream)
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t=>t.stop());
    } catch(e){}
    const constraints = {
      video: { facingMode: front ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false // request audio separately for mic to control echo
    };
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStream = s;
      // attach camera stream to hidden <video> preview (muted)
      video.srcObject = cameraStream;
      await video.play().catch(()=>{});
    } catch (err) {
      console.error('startCamera error', err);
      alert('Error accediendo a la cámara. Revisa permisos.');
    }
  }

  // Ensure microphone access (we keep micStream separate and DO NOT play it)
  async function ensureMic() {
    if (micStream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStream = s;
      // Do NOT attach micStream to any element -> prevents local echo
    } catch (err) {
      console.warn('Microphone not available:', err);
      micStream = null;
    }
  }

  // Resize canvas to match viewport & device pixel ratio
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    recordCanvas.width = Math.round(w * dpr);
    recordCanvas.height = Math.round(h * dpr);
    recordCanvas.style.width = w + 'px';
    recordCanvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Draw one frame: draw video + overlays reading current DOM positions (so canvas matches UI)
  function drawFrame() {
    // draw video frame covering canvas
    const w = recordCanvas.width / (window.devicePixelRatio || 1);
    const h = recordCanvas.height / (window.devicePixelRatio || 1);

    // fill background (black)
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,w,h);

    // draw camera video (cover)
    if (video && video.readyState >= 2) {
      // cover logic: preserve aspect ratio and cover canvas
      const vw = video.videoWidth || w;
      const vh = video.videoHeight || h;
      const vr = vw / vh;
      const cr = w / h;
      let dw = w, dh = h, dx = 0, dy = 0;
      if (vr > cr) {
        dh = h;
        dw = h * vr;
        dx = (w - dw) / 2;
      } else {
        dw = w;
        dh = w / vr;
        dy = (h - dh) / 2;
      }
      try { ctx.drawImage(video, dx, dy, dw, dh); } catch(e){}
    }

    // draw overlays using DOM positions (so canvas result matches on-screen)
    // user icon
    const rectUser = getRect(imgUserEl);
    if (imgUserEl && rectUser) {
      const x = rectUser.left;
      const y = rectUser.top;
      const width = rectUser.width;
      const height = rectUser.height;
      // draw image element source (works cross-origin if hosted same origin)
      try { ctx.drawImage(imgUserEl, x, y, width, height); } catch(e){}
    }

    // user name (if visible)
    if (nameUserEl) {
      const r = getRect(nameUserEl);
      if (r) {
        ctx.font = `${parseInt(window.getComputedStyle(nameUserEl).fontSize) || 18}px ${window.getComputedStyle(nameUserEl).fontFamily || 'Arial'}`;
        ctx.fillStyle = window.getComputedStyle(nameUserEl).color || 'white';
        ctx.fillText(nameUserEl.textContent || '', r.left, r.top + r.height*0.6);
      }
    }

    // viewers row (eye + text)
    if (imgEyeEl) {
      const r = getRect(imgEyeEl);
      if (r) {
        try { ctx.drawImage(imgEyeEl, r.left, r.top, r.width, r.height); } catch(e){}
      }
    }
    if (viewersEl) {
      const r = getRect(viewersEl);
      if (r) {
        ctx.font = `${parseInt(window.getComputedStyle(viewersEl).fontSize) || 18}px ${window.getComputedStyle(viewersEl).fontFamily || 'Arial'}`;
        ctx.fillStyle = window.getComputedStyle(viewersEl).color || 'white';
        ctx.fillText(viewersEl.textContent || '', r.left, r.top + r.height*0.7);
      }
    }

    // LIVE image / badge: draw only when recording and blink state true
    if (isRecording) {
      const r = getRect(liveImgEl);
      if (r && liveBlink) {
        try { ctx.drawImage(liveImgEl, r.left, r.top, r.width, r.height); } catch(e){}
      }
    }

    // Comments: draw from DOM comments (we update DOM comments elsewhere)
    if (commentsEl) {
      const children = Array.from(commentsEl.children);
      // draw from bottom upwards
      for (let i = children.length-1, j=0; i>=0 && j<5; i--, j++) {
        const child = children[i];
        const rc = getRect(child);
        if(!rc) continue;
        ctx.font = `${parseInt(window.getComputedStyle(child).fontSize)||24}px ${window.getComputedStyle(child).fontFamily||'Arial'}`;
        ctx.fillStyle = window.getComputedStyle(child).color || 'white';
        // y position as in DOM:
        ctx.fillText(child.textContent, rc.left, rc.top + rc.height*0.75);
      }
    }

    // bottom icons (draw them too)
    if (bottomIconsEl) {
      const items = Array.from(bottomIconsEl.querySelectorAll('img, button img'));
      items.forEach(it => {
        const r = getRect(it);
        if (r) {
          try { ctx.drawImage(it, r.left, r.top, r.width, r.height); } catch(e){}
        }
      });
    }

    // request next frame only when recording (canvas capture stream can be idle otherwise)
    if (isRecording) raf = requestAnimationFrame(drawFrame);
  }

  // Live blink toggler
  let blinkTimer = null;
  function startBlink() {
    liveBlink = true;
    blinkTimer = setInterval(()=> liveBlink = !liveBlink, 700);
    if (liveImgEl) liveImgEl.classList.add('blink');
  }
  function stopBlink() {
    if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; }
    liveBlink = true;
    if (liveImgEl) liveImgEl.classList.remove('blink');
  }

  // Start initial camera + mic (mic used for recording only, not played)
  await ensureMic();
  await startCamera(usingFront);

  resizeCanvas();

  // Start recording: capture canvas stream + add mic audio tracks
  function startRecording() {
    if (isRecording) return;
    recordedChunks = [];
    canvasStream = recordCanvas.captureStream(30); // 30fps canvas stream

    // create mixed stream: canvas video + mic audio
    mixedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(t=> mixedStream.addTrack(t));
    if (micStream) {
      micStream.getAudioTracks().forEach(t=> mixedStream.addTrack(t));
    }

    // select mime type
    let mime = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mime)) {
      mime = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
    }

    try {
      mediaRecorder = new MediaRecorder(mixedStream, { mimeType: mime });
    } catch (err) {
      console.error('MediaRecorder error', err);
      mediaRecorder = new MediaRecorder(mixedStream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // Combine chunks and trigger download
      const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stream_recording.webm';
      a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 10000);
    };

    mediaRecorder.start(1000);
    isRecording = true;

    // start drawing loop
    drawFrame();
    startBlink();

    // Visual UI: set live badge visible (if present)
    if (liveImgEl) liveImgEl.style.opacity = 1;
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    stopBlink();
    if (liveImgEl) liveImgEl.style.opacity = 0;
  }

  // Toggle recording on REC button
  if (btnRec) {
    btnRec.addEventListener('click', async ()=> {
      // Ensure mic permission before recording
      await ensureMic();
      if (!isRecording) startRecording();
      else stopRecording();
    });
  } else if (btnRec === null && document.querySelector('#REC_BTN')) {
    document.querySelector('#REC_BTN').addEventListener('click', async ()=> {
      await ensureMic();
      if (!isRecording) startRecording(); else stopRecording();
    });
  } else {
    // fallback: try top-level selector used in some versions
    const rec = document.getElementById('REC_BTN') || document.querySelector('#REC_BTN') || document.querySelector('[id*="rec"]');
    if (rec) {
      rec.addEventListener('click', async ()=> { await ensureMic(); if (!isRecording) startRecording(); else stopRecording(); });
    }
  }

  // Camera switch: change camera source; canvas continues to draw video frames -> does not cut recording
  if (btnCam) {
    btnCam.addEventListener('click', async ()=>{
      usingFront = !usingFront;
      await startCamera(usingFront);
      // No need to change recorder: canvas drawing takes new frames automatically
    });
  } else {
    const cam = document.getElementById('CAM_BTN') || document.getElementById('camBtn') || document.querySelector('[id*="cam"]');
    if (cam) cam.addEventListener('click', async ()=> { usingFront = !usingFront; await startCamera(usingFront); });
  }

  // initial viewers updater (exponential-ish)
  let viewers = parseInt((VIEWERS_DOM && VIEWERS_DOM.textContent) ? VIEWERS_DOM.textContent.replace(/\D/g,'') : 50000);
  setInterval(()=>{
    viewers = Math.max(50000, Math.floor(viewers * 1.01 + Math.random()*10));
    if (VIEWERS_DOM) VIEWERS_DOM.textContent = viewers.toLocaleString() + ' viewers';
  }, 2200);

  // safety: resize canvas to current viewport now
  resizeCanvas();

  // expose some functions for debugging in console
  window._recDebug = {
    startRecording, stopRecording, startCamera, ensureMic, isRecording: ()=>isRecording
  };

})();
