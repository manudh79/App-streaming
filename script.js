/* script.js
   - camera start/switch
   - viewers slow increase
   - comments arabic bottom-up (max 5)
   - recording (canvas capture) -> downloads webm
   - live badge blinking while recording
*/

/* DOM */
const video = document.getElementById('video');
const liveBadge = document.getElementById('liveBadge');
const commentsInner = document.getElementById('commentsInner');
const viewersText = document.getElementById('viewersText');

const recBtn = document.getElementById('recBtn');
const camBtn = document.getElementById('camBtn');
const likeBtn = document.getElementById('likeBtn');

const recIcon = document.getElementById('recIcon');

/* state */
let usingFront = false;
let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recording = false;

/* ---------- camera ---------- */
async function startCamera(){
  try{
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: usingFront? 'user':'environment', width:{ideal:1280}, height:{ideal:720} },
      audio: { echoCancellation:true, noiseSuppression:true }
    });
    video.srcObject = stream;
    await video.play();
  }catch(e){
    console.error('getUserMedia error', e);
    alert('Permite cámara y micrófono, luego recarga la página.');
  }
}
startCamera();

camBtn.addEventListener('click', async ()=>{
  usingFront = !usingFront;
  await startCamera();
});

/* ---------- viewers (slow/progressive) ---------- */
let viewers = 50604;
setInterval(()=>{
  // add small random increments to feel organic
  viewers += Math.floor(Math.random()*12) + 3;
  viewersText.textContent = viewers.toLocaleString() + ' viewers';
}, 2500);

/* ---------- comments (Arabic, bottom-up) ---------- */
const arabicNames = ['فهد','سيف','كريم','نور','مروان','آدم','ليلى','سارة','علي','ياسين'];
const arabicMsgs = ['جيد جدًا','أحسنت','أداء ممتاز','جميل جدًا','استمر','رائع'];

function randomComment(){
  const name = arabicNames[Math.floor(Math.random()*arabicNames.length)];
  const msg = arabicMsgs[Math.floor(Math.random()*arabicMsgs.length)];
  const emoji = Math.random() < 0.4 ? (Math.random() < 0.5 ? ' 👍' : ' 🔥') : '';
  return `${name}: ${msg}${emoji}`;
}

// create new comment at slower pace (~3.5s)
setInterval(()=> {
  const div = document.createElement('div');
  div.textContent = randomComment();
  commentsInner.appendChild(div); // column-reverse: append => bottom
  // keep no more than 5 visible
  if(commentsInner.children.length > 5){
    commentsInner.removeChild(commentsInner.children[0]);
  }
}, 3500);

/* ---------- recording (canvas capture) ---------- */

function createRecorderFromCanvas(canvasStream){
  recordedChunks = [];
  let options = {};
  // prefer vp9 if supported
  try{
    if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) options.mimeType = 'video/webm;codecs=vp9';
    else if(MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) options.mimeType = 'video/webm;codecs=vp8';
  }catch(e){}
  try{
    const mr = new MediaRecorder(canvasStream, options);
    mr.ondataavailable = e=>{
      if(e.data && e.data.size) recordedChunks.push(e.data);
    };
    mr.onstop = ()=>{
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // name with timestamp
      const name = 'live_recording_' + (new Date()).toISOString().replace(/[:.]/g,'-') + '.webm';
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
    };
    return mr;
  }catch(err){
    console.error('MediaRecorder creation failed', err);
    return null;
  }
}

let canvasWorker = null; // not used but reserved for future
let drawRAF = null;

function startRecording(){
  if(!video || video.readyState < 2){
    alert('Espera a que la cámara arranque.');
    return;
  }

  // prepare canvas (fallback: OffscreenCanvas if supported)
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;

  // OffscreenCanvas for performance when available
  let canvas;
  if(typeof OffscreenCanvas !== 'undefined'){
    canvas = new OffscreenCanvas(w,h);
  } else {
    // visible fallback (not appended to DOM)
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');

  // draw loop: include overlays in same positions as on screen
  function draw(){
    try{
      ctx.drawImage(video, 0, 0, w, h);

      // draw user icon top-left (approx same size ratio)
      const userW = Math.round(w * 0.045);
      const userH = userW;
      const userX = Math.round(18 * (w / window.innerWidth));
      const userY = Math.round(28 * (h / window.innerHeight));
      const userImg = document.getElementById('userIcon');
      if(userImg && userImg.complete){
        // draw from the actual image element if possible
        ctx.drawImage(userImg, userX, userY, userW, userH);
      }

      // draw viewers row: eye icon then text
      const eyeW = Math.round(w * 0.022);
      const eyeX = userX;
      const eyeY = userY + Math.round(h * 0.08);
      const eyeImg = document.getElementById('eyeIcon');
      if(eyeImg && eyeImg.complete){
        ctx.drawImage(eyeImg, eyeX, eyeY, eyeW, eyeW);
      }
      // viewers text (to the right of eye)
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(w * 0.022)}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText(viewers.toLocaleString() + ' viewers', eyeX + eyeW + Math.round(w * 0.01), eyeY + eyeW/2);

      // draw comments (bottom-left, newest bottom)
      ctx.font = `${Math.round(w * 0.02)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'alphabetic';
      // compute starting Y from bottom
      const lineHeight = Math.round(w * 0.035);
      let startY = h - Math.round(h * 0.18);
      // note: commentsInner children are in DOM; collect last up to 5
      const nodes = Array.from(commentsInner.children).slice(-5);
      // they are in DOM order bottom->top because we append; draw reversed so oldest topmost
      for(let i = nodes.length -1, j=0; i>=0; i--, j++){
        const txt = nodes[i].textContent || '';
        ctx.fillText(txt, userX, startY - j*lineHeight);
      }

      // draw LIVE badge top-right (if recording) - slow blink handled by JS toggling visibility; draw only when visible
      if(recording){
        // draw rounded rect
        const bw = Math.round(w * 0.28);
        const bh = Math.round(w * 0.06);
        const bx = w - bw - Math.round(w * 0.02);
        const by = Math.round(h * 0.03);
        ctx.fillStyle = '#C62828';
        // rounded rect
        const r = bh/2;
        ctx.beginPath();
        ctx.moveTo(bx+r,by);
        ctx.arcTo(bx+bw,by,bx+bw,by+bh,r);
        ctx.arcTo(bx+bw,by+bh,bx,by+bh,r);
        ctx.arcTo(bx,by+bh,bx,by,r);
        ctx.arcTo(bx,by,bx+bw,by,r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `${Math.round(w * 0.02)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('LIVE STREAMING', bx + bw/2, by + bh/2 + 4);
        ctx.textAlign = 'start';
      }

    }catch(e){
      console.warn('draw error', e);
    }
    drawRAF = (typeof window !== 'undefined') ? requestAnimationFrame(draw) : null;
  }
  draw(); // start drawing

  // capture stream from canvas
  const canvasStream = canvas.captureStream(30);
  const finalStream = new MediaStream();

  // add video track(s)
  canvasStream.getVideoTracks().forEach(t=> finalStream.addTrack(t));
  // add mic audio from original stream (if present)
  if(stream && stream.getAudioTracks().length){
    stream.getAudioTracks().forEach(t=> finalStream.addTrack(t));
  }

  // create recorder
  mediaRecorder = createRecorderFromCanvas(finalStream);
  if(!mediaRecorder){
    alert('Su navegador no admite MediaRecorder para este formato. Prueba con Chrome/Firefox en Android/PC.');
    if(drawRAF) cancelAnimationFrame(drawRAF);
    return;
  }

  mediaRecorder.start(1000);
  recording = true;

  // ui
  liveBadge.style.display = 'block';
  startBlinkingBadge();

  // when stopped, onstop handler in createRecorderFromCanvas will download
}

/* createRecorder helper (reused) */
function createRecorderFromCanvas(stream){
  let rec = null;
  try{
    let opts = {};
    if(MediaRecorder && MediaRecorder.isTypeSupported){
      if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) opts.mimeType='video/webm;codecs=vp9';
      else if(MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) opts.mimeType='video/webm;codecs=vp8';
    }
    rec = new MediaRecorder(stream, opts);
    recordedChunks = [];
    rec.ondataavailable = e => { if(e.data && e.data.size) recordedChunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display='none';
      a.href = url;
      a.download = 'live_' + (new Date()).toISOString().replace(/[:.]/g,'-') + '.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
    };
  }catch(err){
    console.error('create recorder failed', err);
    rec = null;
  }
  return rec;
}

/* blink control */
let blinkTimer = null;
function startBlinkingBadge(){
  if(blinkTimer) clearInterval(blinkTimer);
  // toggle visibility slowly (700-900ms)
  blinkTimer = setInterval(()=>{
    liveBadge.style.display = (liveBadge.style.display === 'none') ? 'block' : 'none';
  }, 700);
}
function stopBlinkingBadge(){
  if(blinkTimer) clearInterval(blinkTimer);
  blinkTimer = null;
  liveBadge.style.display = 'none';
}

/* rec button */
recBtn.addEventListener('click', ()=>{
  if(!recording) startRecording();
  else {
    // stop
    if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    recording = false;
    stopBlinkingBadge();

    // stop any draw RAF if present: we rely on recording being stopped
    // (draw loop will exit naturally)
  }
});

/* like button simple behaviour: push small comment (no emojis heavy) */
likeBtn.addEventListener('click', ()=>{
  const el = document.createElement('div');
  el.textContent = 'أحببت هذا'; // neutral: "I like this"
  commentsInner.appendChild(el);
  if(commentsInner.children.length > 5) commentsInner.removeChild(commentsInner.children[0]);
});
