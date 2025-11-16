/* ----------------------------------------------------
   VARIABLES GLOBALES
---------------------------------------------------- */
let stream;
let recorder;
let chunks = [];
let usingFront = false;

const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveBadge = document.getElementById("liveBadge");
const viewersText = document.getElementById("viewersText");
const commentsInner = document.getElementById("commentsInner");

/* ----------------------------------------------------
   1. INICIAR CÁMARA
---------------------------------------------------- */
async function startCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: usingFront ? "user" : "environment" },
    audio: true
  });

  video.srcObject = stream;
}
startCamera();

/* ----------------------------------------------------
   2. CAMBIAR CÁMARA
---------------------------------------------------- */
camBtn.addEventListener("click", () => {
  usingFront = !usingFront;
  startCamera();
});

/* ----------------------------------------------------
   3. PARPADEO LIVE STREAMING
---------------------------------------------------- */
let liveBlinkInterval = null;

function startLiveBlink() {
  liveBadge.style.display = "block";
  liveBlinkInterval = setInterval(() => {
    liveBadge.style.opacity = liveBadge.style.opacity === "0.3" ? "1" : "0.3";
  }, 800);
}

function stopLiveBlink() {
  clearInterval(liveBlinkInterval);
  liveBadge.style.display = "none";
  liveBadge.style.opacity = "1";
}

/* ----------------------------------------------------
   4. GRABAR
---------------------------------------------------- */
recBtn.addEventListener("click", () => {
  if (!recorder) startRecording();
  else stopRecording();
});

async function startRecording() {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");

  chunks = [];

  recorder = new MediaRecorder(canvas.captureStream(30), {
    mimeType: "video/webm;codecs=vp09"
  });

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.mp4";
    a.click();

    URL.revokeObjectURL(url);
    recorder = null;
  };

  function drawFrame() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  recorder.start();
  startLiveBlink();
}

/* ----------------------------------------------------
   5. DETENER GRABACIÓN
---------------------------------------------------- */
function stopRecording() {
  recorder.stop();
  stopLiveBlink();
}

/* ----------------------------------------------------
   6. VIEWERS — crecimiento progresivo
---------------------------------------------------- */
let viewers = 50604;

setInterval(() => {
  viewers += Math.floor(Math.random() * 20) + 5;
  viewersText.textContent = viewers.toLocaleString() + " viewers";
}, 1500);

/* ----------------------------------------------------
   7. COMENTARIOS — SOLO ÁRABE
---------------------------------------------------- */

const arabicNames = ["سيف", "مروان", "علي", "كريم", "خالد", "سارة", "نور", "ليلى"];
const arabicMsgs = [
  "أداء ممتاز 👍",
  "استمر 🔥🔥",
  "جميل جدًا 👍",
  "أنت بطل 👍",
  "عمل رائع 🔥",
  "استمر يا أسد 👍"
];

setInterval(() => {
  const name = arabicNames[Math.floor(Math.random() * arabicNames.length)];
  const msg = arabicMsgs[Math.floor(Math.random() * arabicMsgs.length)];

  const newComment = document.createElement("div");
  newComment.textContent = `${name}: ${msg}`;

  commentsInner.appendChild(newComment);

  if (commentsInner.children.length > 5) {
    commentsInner.removeChild(commentsInner.children[0]);
  }

}, 1700);
