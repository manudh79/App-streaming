const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const viewersNumber = document.getElementById("viewersNumber");
const commentsBox = document.getElementById("commentsBox");

let currentFacingMode = "environment";
let mediaRecorder = null;
let chunks = [];
let isRecording = false;
let stream = null;

/* -------------- INICIAR CÁMARA -------------- */

async function startCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: currentFacingMode,
      width: { ideal: 1080 },
      height: { ideal: 1920 }
    },
    audio: true
  });

  video.srcObject = stream;
}

startCamera();

/* -------------- CAMBIAR CÁMARA SIN PARAR GRABACIÓN -------------- */

camBtn.addEventListener("click", async () => {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  await startCamera();

  if (isRecording) {
    mediaRecorder.pause();
    mediaRecorder.resume();
  }
});

/* -------------- EMPEZAR / PARAR GRABACIÓN -------------- */

recBtn.addEventListener("click", () => {
  if (!isRecording) startRecording();
  else stopRecording();
});

function startRecording() {
  if (!stream) return;

  chunks = [];
  isRecording = true;

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp9",
    videoBitsPerSecond: 6000000  // calidad alta
  });

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = saveRecording;

  mediaRecorder.start(100);
  liveIcon.style.display = "block";
  blinkLive();
}

function stopRecording() {
  isRecording = false;
  liveIcon.style.display = "none";
  mediaRecorder.stop();
}

function saveRecording() {
  const blob = new Blob(chunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kalal_stream.webm";
  a.click();

  URL.revokeObjectURL(url);
}

/* -------------- PARPADEO LIVE STREAMING -------------- */

function blinkLive() {
  if (!isRecording) return;
  liveIcon.style.opacity = liveIcon.style.opacity === "0.2" ? "1" : "0.2";
  setTimeout(blinkLive, 500);
}

/* -------------- COMENTARIOS EN ÁRABE -------------- */

const arabicUsers = ["علي","سيف","مروان","نور","هاشم","سارة","مريم"];
const arabicMsgs = ["استمر","عمل رائع","قوة","نحن معك","لا تتوقف","ممتاز"];

setInterval(() => {
  const name = arabicUsers[Math.floor(Math.random()*arabicUsers.length)];
  const msg = arabicMsgs[Math.floor(Math.random()*arabicMsgs.length)];
  const emoji = Math.random() < 0.4 ? (Math.random() < 0.5 ? "🔥" : "👍") : "";

  const el = document.createElement("div");
  el.textContent = `${name}: ${msg} ${emoji}`;
  commentsBox.appendChild(el);

  if (commentsBox.children.length > 5)
    commentsBox.removeChild(commentsBox.children[0]);
}, 2000);

/* -------------- VIEWERS AUTO -------------- */

let viewers = 51824;
setInterval(() => {
  viewers += Math.floor(Math.random()*15) + 5;
  viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2300);
