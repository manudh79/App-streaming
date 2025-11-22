// =========================
// ELEMENTOS DOM
// =========================
const liveVideo = document.getElementById("liveVideo");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const livePill = document.getElementById("livePill");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersText = document.getElementById("viewersText");

const rawPlayback = document.getElementById("rawPlayback");
const mixCanvas = document.getElementById("mixCanvas");
const mixCtx = mixCanvas.getContext("2d");

// =========================
// ESTADO CÁMARA / GRABACIÓN
// =========================
let currentStream = null;
let usingFront = false;

let camRecorder = null; // graba la cámara "limpia"
let camChunks = [];
let isRecording = false;

let viewersCount = 51824;

// Para regenerar overlays en mezcla final
let recordStartTime = 0;

// =========================
// INICIAR CÁMARA
// =========================
async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
  }

  const constraintPresets = [
    { width: { ideal: 3840 }, height: { ideal: 2160 } },
    { width: { ideal: 2560 }, height: { ideal: 1440 } },
    { width: { ideal: 1920 }, height: { ideal: 1080 } },
    { width: { ideal: 1280 }, height: { ideal: 720 } },
  ];

  let stream = null;

  for (const preset of constraintPresets) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: usingFront ? "user" : "environment",
          ...preset,
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      break;
    } catch (e) {
      // probar siguiente resolución
    }
  }

  if (!stream) {
    alert("No se pudo acceder a la cámara.");
    return;
  }

  currentStream = stream;
  liveVideo.srcObject = stream;
  liveVideo.muted = true;
  liveVideo.volume = 0;

  await liveVideo.play();
}

startCamera();

// =========================
// VIEWERS PROGRESIVOS
// =========================
setInterval(() => {
  viewersCount += Math.floor(Math.random() * 20) + 5;
  viewersText.textContent = viewersCount.toLocaleString("en-US") + " viewers";
}, 2500);

// =========================
// COMENTARIOS EN ARABE (LIVE UI)
// =========================
const arabicNames = ["علي", "رائد", "سيف", "مروان", "كريم", "هيثم", "نور", "سارة"];
const arabicMsgs = ["استمر", "أبدعت", "عمل رائع", "جميل جدا", "ممتاز", "لا تتوقف"];
const emojis = ["🔥", "👍"];

function randomComment() {
  const name = arabicNames[Math.floor(Math.random() * arabicNames.length)];
  const msg = arabicMsgs[Math.floor(Math.random() * arabicMsgs.length)];
  const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random() * emojis.length)] : "";
  return `${name}: ${msg} ${emoji}`.trim();
}

function addLiveComment() {
  const div = document.createElement("div");
  div.className = "comment";
  div.textContent = randomComment();
  commentsBox.appendChild(div);
  if (commentsBox.children.length > 5) {
    commentsBox.removeChild(commentsBox.children[0]);
  }
}
setInterval(addLiveComment, 2300);

// =========================
// BOTÓN CAMBIAR CÁMARA (NO CORTA RECODIFICACIÓN, SOLO CAMBIO EN DIRECTO)
// =========================
camBtn.addEventListener("click", async () => {
  usingFront = !usingFront;
  await startCamera();
});

// =========================
// INICIAR GRABACIÓN CRUDA (SOLO CÁMARA)
// =========================
recBtn.addEventListener("click", () => {
  if (!isRecording) {
    startRawRecording();
  } else {
    stopRawRecording();
  }
});

function startRawRecording() {
  if (!currentStream) {
    alert("No hay cámara disponible.");
    return;
  }

  camChunks = [];
  isRecording = true;
  recordStartTime = performance.now();

  // icono LIVE visible y parpadeando
  livePill.style.display = "block";
  livePill.classList.add("blink");

  const options = {};
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    options.mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    options.mimeType = "video/webm;codecs=vp8";
  } else {
    options.mimeType = "video/webm";
  }

  camRecorder = new MediaRecorder(currentStream, {
    ...options,
    videoBitsPerSecond: 12_000_000,
  });

  camRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) camChunks.push(e.data);
  };

  camRecorder.onstop = async () => {
    // Mezclar overlays en un segundo paso
    const rawBlob = new Blob(camChunks, { type: camChunks[0]?.type || "video/webm" });
    await mixOverlayWithRawVideo(rawBlob);
  };

  camRecorder.start(100);
}

// =========================
// PARAR GRABACIÓN CRUDA
// =========================
function stopRawRecording() {
  isRecording = false;
  livePill.style.display = "none";
  livePill.classList.remove("blink");
  camRecorder.stop();
}

// =========================
// MEZCLA FINAL: REPRODUCIR RAW + SUPERPONER OVERLAYS EN CANVAS
// =========================
async function mixOverlayWithRawVideo(rawBlob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(rawBlob);
    rawPlayback.src = url;
    rawPlayback.currentTime = 0;
    rawPlayback.muted = true;

    rawPlayback.onloadedmetadata = () => {
      const w = rawPlayback.videoWidth || 1280;
      const h = rawPlayback.videoHeight || 720;
      mixCanvas.width = w;
      mixCanvas.height = h;

      const stream = mixCanvas.captureStream(30);
      const mixedChunks = [];

      let options = {};
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        options.mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        options.mimeType = "video/webm;codecs=vp8";
      } else {
        options.mimeType = "video/webm";
      }

      const mixRecorder = new MediaRecorder(stream, {
        ...options,
        videoBitsPerSecond: 12_000_000,
      });

      mixRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) mixedChunks.push(e.data);
      };

      mixRecorder.onstop = () => {
        const finalBlob = new Blob(mixedChunks, { type: mixedChunks[0]?.type || "video/webm" });
        const finalUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = "stream_overlay.webm";
        a.click();
        URL.revokeObjectURL(finalUrl);
        URL.revokeObjectURL(url);
        resolve();
      };

      // Estado para comentarios en mezcla (cronología propia)
      const mixComments = [];
      let nextCommentTime = 0;
      const commentInterval = 2.3; // segundos entre comentarios

      // viewers base para mezcla
      let baseViewers = viewersCount;

      function drawMixFrame() {
        // si se ha parado
        if (rawPlayback.ended || rawPlayback.currentTime >= rawPlayback.duration) {
          mixRecorder.stop();
          return;
        }

        const t = rawPlayback.currentTime; // segundos desde inicio mezcla
        mixCtx.drawImage(rawPlayback, 0, 0, w, h);

        // Escalas relativas (para que funcione en 16:9, 19.5:9, etc.)
        const rel = {
          userX: 0.03 * w,
          userY: 0.03 * h,
          userSize: 0.1 * h, // tamaño relativo

          viewersX: 0.03 * w + 0.11 * h,
          viewersY: 0.04 * h,
          eyeW: 0.035 * w,

          liveW: 0.28 * w,
          liveH: 0.08 * h,
          liveX: w - 0.03 * w - 0.28 * w,
          liveY: 0.03 * h,
        };

        // Icono usuario
        const userImg = document.getElementById("userIcon");
        mixCtx.drawImage(userImg, rel.userX, rel.userY, rel.userSize, rel.userSize);

        // Viewers (ojo + texto)
        const eyeImg = document.getElementById("eyeIcon");
        mixCtx.drawImage(eyeImg, rel.viewersX, rel.viewersY, rel.eyeW, rel.eyeW);

        const viewersForTime = baseViewers + Math.floor(t * 12);
        mixCtx.font = `${Math.round(w * 0.022)}px Arial`;
        mixCtx.fillStyle = "white";
        mixCtx.textBaseline = "middle";
        mixCtx.fillText(
          viewersForTime.toLocaleString("en-US") + " viewers",
          rel.viewersX + rel.eyeW + 0.012 * w,
          rel.viewersY + rel.eyeW / 2
        );

        // LIVE pill parpadeando
        const blinkOn = Math.floor(t * 2) % 2 === 0;
        if (blinkOn) {
          const liveImg = document.getElementById("liveIcon");
          mixCtx.drawImage(liveImg, rel.liveX, rel.liveY, rel.liveW, rel.liveH);
        }

        // Generar comentarios en mezcla acorde al tiempo
        while (t >= nextCommentTime) {
          mixComments.push(randomComment());
          if (mixComments.length > 5) mixComments.shift();
          nextCommentTime += commentInterval;
        }

        // Pintar comentarios (bottom-left)
        mixCtx.font = `${Math.round(w * 0.022)}px Arial`;
        mixCtx.fillStyle = "white";
        mixCtx.textBaseline = "alphabetic";
        const lineHeight = Math.round(h * 0.04);
        let startY = h - 0.20 * h;
        for (let i = mixComments.length - 1, j = 0; i >= 0; i--, j++) {
          const txt = mixComments[i];
          mixCtx.fillText(txt, rel.userX, startY - j * lineHeight);
        }

        // Iconos inferiores
        const recImg = document.getElementById("recIcon");
        const camImg = document.getElementById("camIcon");
        const heartImg = document.getElementById("heartIcon");

        const barY = h - 0.14 * h;
        const iconSize = 0.1 * h;
        const centerX = w / 2;

        mixCtx.drawImage(recImg, centerX - 1.1 * iconSize, barY, iconSize, iconSize);
        mixCtx.drawImage(camImg, centerX - iconSize / 2, barY, iconSize, iconSize);
        mixCtx.drawImage(heartImg, centerX + 0.6 * iconSize, barY, iconSize, iconSize);

        requestAnimationFrame(drawMixFrame);
      }

      mixRecorder.start(100);
      rawPlayback.play().then(() => {
        requestAnimationFrame(drawMixFrame);
      });
    };
  });
}
