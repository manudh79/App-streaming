/* script.js - canvas recording + camera switching without stopping recording
   Required icons folder: /icons (KALAL.png, EYE.png, LIVE.png, REC.png, CAM.png, HEART.png)
*/
(async function(){
  const video = document.getElementById('video');
  const recBtn = document.getElementById('recBtn');
  const camBtn = document.getElementById('camBtn');
  const heartBtn = document.getElementById('heartBtn');

  // create visible canvas to show final image (and also used for recording)
  const canvas = document.createElement('canvas');
  canvas.id = 'canvasOverlay';
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = '1';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  // hide the raw video element (we use it as source only)
  video.style.display = 'none';

  const ctx = canvas.getContext('2d');

  let usingFront = false;
  let currentVideoStream = null;
  let micStream = null;
  let recording = false;
  let recorder = null;
  let chunks = [];

  let blink = true;
  let blinkInterval = null;

  // load images
  const loadImage = src => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

  const icons = {};
  async function preloadIcons() {
    const names = {k:'icons/KALAL.png', e:'icons/EYE.png', l:'icons/LIVE.png', r:'icons/REC.png', c:'icons/CAM.png', h:'icons/HEART.png'};
    for (const k of Object.keys(names)) {
      try { icons[k] = await loadImage(names[k]); } catch(e){ console.warn('icon missing', names[k]); icons[k]=null; }
    }
  }
  await preloadIcons();

  // comments sample (arabic supportive)
  const arabicNames = ['رائد','سيف','علي','مروان','كريم','هيثم','وليد','يوسف'];
  const msgs = ['استمر','ممتاز','عمل رائع','أحسنت','جيد جداً'];
  function randomComment() {
    const name = arabicNames[Math.floor(Math.random()*arabicNames.length)];
    const text = msgs[Math.floor(Math.random()*msgs.length)];
    // 40% chance reaction
    const r = Math.random();
    const react = r < 0.4 ? (Math.random()<0.5? ' 👍':' 🔥') : '';
    return {user:name, text: text + react};
  }

  let comments = [];
  function addComment() {
    comments.push(randomComment());
    if (comments.length>8) comments.shift();
    // also update visual comments DOM (optional)
    refreshCommentsDOM();
  }
  function refreshCommentsDOM(){
    const container = document.getElementById('comments');
    if(!container) return;
    container.innerHTML = '';
    const slice = comments.slice(-6);
    // draw from oldest at top to newest at bottom (so they appear to rise)
    for (let i = slice.length-1; i>=0; i--){
      const c = slice[i];
      const d = document.createElement('div');
      d.className = 'comment';
      d.textContent = `${c.user}: ${c.text}`;
      container.appendChild(d);
    }
  }

  // viewers growth
  let viewers = 50604;
  setInterval(()=>{ viewers = Math.floor(viewers * 1.006); document.getElementById('viewers').textContent = viewers.toLocaleString() + ' viewers'; }, 2000);
  // initial display
  document.getElementById('viewers').textContent = viewers.toLocaleString() + ' viewers';

  // CAMERA
  async function startCamera(front=false, withAudio=false) {
    // stop previous video tracks
    if (currentVideoStream) {
      currentVideoStream.getTracks().forEach(t => t.stop());
      currentVideoStream = null;
    }
    const constraints = { video: { facingMode: front ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
    if (withAudio) constraints.audio = true;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // if withAudio, store mic stream but stop its video tracks
    if (withAudio && !micStream) {
      micStream = stream;
      micStream.getVideoTracks().forEach(t=>t.stop());
    } else {
      // use video-only stream for preview
      const vTracks = stream.getVideoTracks();
      const vStream = new MediaStream(vTracks);
      currentVideoStream = vStream;
      video.srcObject = vStream;
      await video.play().catch(()=>{});
    }
    // update DOM indicator for camera icon if needed (not required)
  }

  // start initial camera (rear) with microphone
  await startCamera(false, true);

  // create recording stream when needed: combine canvas video + mic audio
  function createRecorder() {
    const canvasStream = canvas.captureStream(30);
    let combinedStream;
    if (micStream && micStream.getAudioTracks().length>0) {
      combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...micStream.getAudioTracks()]);
    } else {
      combinedStream = canvasStream;
    }
    const options = { mimeType: 'video/webm;codecs=vp9' };
    try {
      recorder = new MediaRecorder(combinedStream, options);
    } catch(e){
      recorder = new MediaRecorder(combinedStream);
    }
    recorder.ondataavailable = e => { if (e.data && e.data.size>0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      chunks = [];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stream_recording.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
    return recorder;
  }

  // handle REC button
  recBtn.addEventListener('click', async ()=>{
    if (!recording) {
      // start recording
      chunks = [];
      createRecorder();
      recorder.start();
      recording = true;
      if (!blinkInterval) blinkInterval = setInterval(()=> blink = !blink, 700);
      recBtn.classList.add('recording');
      document.getElementById('live-badge').style.visibility = 'visible';
    } else {
      // stop recording
      recording = false;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      if (blinkInterval) { clearInterval(blinkInterval); blinkInterval=null; blink=true; }
      recBtn.classList.remove('recording');
      document.getElementById('live-badge').style.visibility = 'hidden';
    }
  });

  // handle camera switch (does NOT stop recording)
  camBtn.addEventListener('click', async ()=>{
    usingFront = !usingFront;
    // request only video so micStream stays intact
    const constraints = { video: { facingMode: usingFront ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // stop old video tracks
    if (currentVideoStream) currentVideoStream.getTracks().forEach(t=>t.stop());
    // set new video stream
    const vTracks = stream.getVideoTracks();
    const vStream = new MediaStream(vTracks);
    currentVideoStream = vStream;
    video.srcObject = vStream;
    await video.play().catch(()=>{});
  });

  // draw loop - draw video + overlays into canvas (so exported video matches on-screen)
  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = w+'px';
    canvas.style.height = h+'px';
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof stroke === 'undefined') stroke = true;
    if (typeof r === 'number') {
      r = {tl: r, tr: r, br: r, bl: r};
    } else {
      var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
      for (var side in defaultRadius) r[side] = r[side] || defaultRadius[side];
    }
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawFrame(){
    // clear
    ctx.clearRect(0,0,canvas.width, canvas.height);
    // draw video scaled to full canvas
    try { ctx.drawImage(video, 0, 0, canvas.width/(window.devicePixelRatio||1), canvas.height/(window.devicePixelRatio||1)); } catch(e){}

    // top-left icon + username
    const padding = 12;
    const iconSize = 56;
    const xIcon = padding;
    const yIcon = padding;
    if (icons.k) ctx.drawImage(icons.k, xIcon, yIcon, iconSize, iconSize);
    ctx.fillStyle = 'white';
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('KALAL_Y', xIcon + iconSize + 8, yIcon + iconSize/2);

    // viewers: eye + number under
    if (icons.e) ctx.drawImage(icons.e, xIcon, yIcon + iconSize + 8, 28, 20);
    ctx.font = '29px sans-serif'; // slightly smaller as requested
    ctx.fillStyle = 'white';
    ctx.fillText(viewers.toLocaleString() + ' viewers', xIcon + 40, yIcon + iconSize + 24);

    // LIVE badge top-right (blinking when recording)
    if (recording && blink) {
      const badgeW = 200;
      const badgeH = 46;
      const bx = window.innerWidth - badgeW - 8; // 8px from right
      const by = 6; // 6px top
      ctx.fillStyle = '#b92f2f';
      roundRect(ctx, bx, by, badgeW, badgeH, 12, true, false);
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LIVE STREAMING', bx + badgeW/2, by + badgeH/2);
      ctx.textAlign = 'start';
    }

    // comments (from bottom-left upward)
    const commentStartY = window.innerHeight - 150;
    ctx.font = '36px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 6;
    let y = commentStartY;
    const slice = comments.slice(-6);
    for (let i = slice.length-1;i>=0;i--){
      const c = slice[i];
      ctx.fillText(c.user + ': ' + c.text, 18, y);
      y -= 46;
    }
    ctx.shadowColor = 'transparent';

    // bottom controls (centered)
    const bottomY = window.innerHeight - 110;
    const centerX = window.innerWidth/2;
    const spacing = 120;
    if (icons.r) ctx.drawImage(icons.r, centerX - spacing, bottomY, 100, 100);
    if (icons.c) ctx.drawImage(icons.c, centerX, bottomY, 100, 100);
    if (icons.h) ctx.drawImage(icons.h, centerX + spacing, bottomY, 100, 100);

    requestAnimationFrame(drawFrame);
  }

  // periodic comments generation
  setInterval(()=>{ addComment(); }, 2200);

  requestAnimationFrame(drawFrame);

  // expose for debugging
  window.__streaming = { startCamera, startRecording: ()=>recBtn.click() };

})();
