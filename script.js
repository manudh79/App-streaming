/* =============================
   ELEMENTOS DEL DOM
============================= */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const heartBtn = document.getElementById("heartBtn");

const userIcon = document.getElementById("userIcon");
const eyeIcon = document.getElementById("eyeIcon");
const viewersNumber = document.getElementById("viewersNumber");
const viewersLabel = document.getElementById("viewersLabel");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");

/* =============================
   ESTADO
============================= */
let usingFront = false;
let cameraStream = null;      // solo vídeo
let micStream = null;         // solo audio
let recorder = null;          // MediaRecorder del canvas
let recording = false;
let chunks = [];

let viewers = 51824;

/* =============================
   CANVAS OCULTO PARA GRABAR
============================= */
const recordCanvas = document.createElement("canvas");
recordCanvas.id = "recordCanvas";
recordCanvas.style.display = "none";
document.body.appendChild(recordCanvas);
const ctx = recordCanvas.getContext("2d");

/* =============================
   INICIAR CÁMARA (VÍDEO SOLAMENTE)
============================= */
async function startCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
  }

  // Pedimos buena resolución, el navegador elegirá lo máximo que pueda
  const constraints = {
    video: {
      facingMode: usingFront ? "user" : "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    },
    audio: false
  };

  cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = cameraStream;
  video.muted = true;

  await video.play();

  // Cuando tengamos metadatos, ajustamos el canvas al tamaño real del vídeo
  updateCanvasSize();
}

function updateCanvasSize() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  recordCanvas.width = vw;
  recordCanvas.height = vh;
}

/* =============================
   AUDIO (MIC SEPARADO, SIN ECO)
============================= */
async function getMicStream() {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      },
      video: false
    });
  }
  return micStream;
}

/* =============================
   LOOP DE DIBUJO EN CANVAS
   (LO QUE SE GRABA)
============================= */
function drawToCanvas() {
  if (!recording) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    requestAnimationFrame(drawToCanvas);
    return;
  }

  // Aseguramos tamaño correcto por si cambió al girar/otra cámara
  if (recordCanvas.width !== vw || recordCanvas.height !== vh) {
    recordCanvas.width = vw;
    recordCanvas.height = vh;
  }

  const cw = recordCanvas.width;
  const ch = recordCanvas.height;

  // Fondo: frame de cámara
  ctx.drawImage(video, 0, 0, cw, ch);

  // Mapeo de pantalla → canvas
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const scaleX = cw / winW;
  const scaleY = ch / winH;

  // Helper para dibujar un <img> DOM en la posición donde está en pantalla
  function drawImgFromDom(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left * scaleX;
    const y = r.top * scaleY;
    const w = r.width * scaleX;
    const h = r.height * scaleY;
    // Creamos un objeto Image usando el mismo src
    const img = el._cachedImg || new Image();
    if (!el._cachedImg) {
      img.src = el.src;
      el._cachedImg = img;
    }
    if (img.complete) {
      ctx.drawImage(img, x, y, w, h);
    }
  }

  // Helper para dibujar texto donde está el span
  function drawTextFromDom(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const fontSizePx = parseFloat(style.fontSize) || 16;
    const canvasFontSize = fontSizePx * scaleY;
    ctx.font = `${canvasFontSize}px ${style.fontFamily || "Arial"}`;
    ctx.fillStyle = style.color || "white";
    ctx.textBaseline = "top";

    const x = r.left * scaleX;
    const y = r.top * scaleY;
    ctx.fillText(el.textContent, x, y);
  }

  // === Dibujar overlays ===
  drawImgFromDom(userIcon);
  drawImgFromDom(eyeIcon);
  drawTextFromDom(viewersNumber);
  drawTextFromDom(viewersLabel);

  if (liveIcon.style.display !== "none") {
    drawImgFromDom(liveIcon);
  }

  // Comentarios (cada <div> dentro de #comments)
  const commentNodes = Array.from(commentsBox.children);
  commentNodes.forEach(div => drawTextFromDom(div));

  // Iconos inferiores
  drawImgFromDom(recBtn);
  drawImgFromDom(camBtn);
  drawImgFromDom(heartBtn);

  requestAnimationFrame(drawToCanvas);
}

/* =============================
   INICIAR GRABACIÓN (CANVAS + AUDIO)
============================= */
async function startRecording() {
  updateCanvasSize();

  const canvasStream = recordCanvas.captureStream(30); // 30 fps deseados
  const mic = await getMicStream();
  const audioTrack = mic.getAudioTracks()[0];
  if (audioTrack) {
    canvasStream.addTrack(audioTrack);
  }

  chunks = [];

  let options = {};
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    options.mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    options.mimeType = "video/webm;codecs=vp8";
  } else {
    options.mimeType = "video/webm";
  }

  recorder = new MediaRecorder(canvasStream, {
    ...options,
    videoBitsPerSecond: 15_000_000 // pedimos bastante bitrate (el navegador puede limitarlo)
  });

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: chunks[0]?.type || "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stream_recording.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  recorder.start(100);
  recording = true;

  // LIVE visible y parpadeando
  liveIcon.style.display = "block";
  liveIcon.classList.add("blink");

  requestAnimationFrame(drawToCanvas);
}

/* =============================
   PARAR GRABACIÓN
============================= */
function stopRecording() {
  recording = false;
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
  liveIcon.style.display = "none";
  liveIcon.classList.remove("blink");
}

/* =============================
   BOTONES
============================= */
recBtn.addEventListener("click", () => {
  if (!recording) startRecording();
  else stopRecording();
});

camBtn.addEventListener("click", async () => {
  usingFront = !usingFront;
  await startCamera();
  // 🔹 El recorder NO se toca: sigue dibujando lo que vea en <video>,
  // así que puedes cambiar de cámara sin cortar la grabación.
});

heartBtn.addEventListener("click", () => {
  // Aquí podrías hacer animaciones futuras si quieres
});

/* =============================
   COMENTARIOS EN ÁRABE
============================= */
const names = ["علي","رائد","سيف","مروان","كريم","هيثم","نور","سارة"];
const texts = ["استمر", "أبدعت", "عمل رائع", "جميل جدا", "ممتاز", "لا تتوقف"];
const emojis = ["🔥","👍"];

function addComment() {
  const name = names[Math.floor(Math.random() * names.length)];
  const text = texts[Math.floor(Math.random() * texts.length)];
  const hasEmoji = Math.random() < 0.4;
  const emoji = hasEmoji ? " " + emojis[Math.floor(Math.random() * emojis.length)] : "";

  const div = document.createElement("div");
  div.className = "comment";
  div.textContent = `${name}: ${text}${emoji}`;

  commentsBox.appendChild(div);
  if (commentsBox.children.length > 5) {
    commentsBox.removeChild(commentsBox.children[0]);
  }
}

setInterval(addComment, 2300);

/* =============================
   VIEWERS AUTO + EXPONENCIAL
============================= */
setInterval(() => {
  viewers += Math.floor(Math.random() * 25) + 5;
  viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);

/* =============================
   ARRANQUE INICIAL
============================= */
startCamera().catch(err => {
  console.error("Error cámara:", err);
  alert("Activa permisos de cámara y micrófono");
});
