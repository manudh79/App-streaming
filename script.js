/* ============================
   ELEMENTOS
============================ */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");

const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

const recordCanvas = document.getElementById("recordCanvas");
const ctx = recordCanvas.getContext("2d");

let currentStream = null;
let usingFront = false;

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

/* ============================
   INICIAR CÁMARA
============================ */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment"
        },
        audio: true
    });

    video.muted = true;       // evita eco
    video.volume = 0;         // asegura silencio real
    video.srcObject = currentStream;

    return currentStream;
}

startCamera();

/* ============================
   FUNCIÓN PRINCIPAL DE DIBUJO (MODO A)
============================ */
function drawToCanvas() {
    if (!isRecording) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) {
        requestAnimationFrame(drawToCanvas);
        return;
    }

    recordCanvas.width = vw;
    recordCanvas.height = vh;

    // 1. Dibujar vídeo base
    ctx.drawImage(video, 0, 0, vw, vh);

    // 2. Dibujar icono usuario
    const user = document.getElementById("userIcon");
    const ub = user.getBoundingClientRect();
    ctx.drawImage(user, ub.left, ub.top, ub.width, ub.height);

    // 3. Dibujar viewers
    const eye = document.getElementById("eyeIcon");
    const eb = eye.getBoundingClientRect();
    ctx.drawImage(eye, eb.left, eb.top, eb.width, eb.height);

    const vb = viewersNumber.getBoundingClientRect();
    ctx.font = "19px Arial";
    ctx.fillStyle = "white";
    ctx.fillText(viewersNumber.textContent, vb.left, vb.top + vb.height - 5);

    const viewersLabel = document.getElementById("viewersLabel");
    const vlb = viewersLabel.getBoundingClientRect();
    ctx.font = "17px Arial";
    ctx.fillText(viewersLabel.textContent, vlb.left, vlb.top + vlb.height - 5);

    // 4. Live Streaming
    if (isRecording) {
        const live = document.getElementById("liveIcon");
        const lb = live.getBoundingClientRect();
        ctx.drawImage(live, lb.left, lb.top, lb.width, lb.height);
    }

    // 5. Comentarios
    const children = Array.from(commentsBox.children);
    ctx.font = "26px Arial";
    ctx.fillStyle = "white";

    children.forEach(el => {
        const r = el.getBoundingClientRect();
        ctx.fillText(el.textContent, r.left, r.top + 28);
    });

    // 6. Iconos inferiores
    const rec = document.getElementById("recBtn").getBoundingClientRect();
    ctx.drawImage(document.getElementById("recBtn"), rec.left, rec.top, rec.width, rec.height);

    const cam = document.getElementById("camBtn").getBoundingClientRect();
    ctx.drawImage(document.getElementById("camBtn"), cam.left, cam.top, cam.width, cam.height);

    const heart = document.getElementById("heartBtn").getBoundingClientRect();
    ctx.drawImage(document.getElementById("heartBtn"), heart.left, heart.top, heart.width, heart.height);

    requestAnimationFrame(drawToCanvas);
}

/* ============================
   INICIAR GRABACIÓN (MODO A)
============================ */
function startRecording() {
    isRecording = true;
    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    recordedChunks = [];

    const canvasStream = recordCanvas.captureStream(30); // 30fps
    const audioTrack = currentStream.getAudioTracks()[0];

    canvasStream.addTrack(audioTrack);

    mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();

    drawToCanvas();
}

/* ============================
   DETENER GRABACIÓN
============================ */
function stopRecording() {
    isRecording = false;

    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");

    mediaRecorder.stop();
}

/* ============================
   GUARDAR ARCHIVO WEBM
============================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream_recording.webm";
    a.click();
}

/* ============================
   BOTÓN REC
============================ */
recBtn.onclick = () => {
    if (!isRecording) startRecording();
    else stopRecording();
};

/* ============================
   CAMBIO DE CÁMARA
============================ */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* ============================
   COMENTARIOS (tu versión)
============================ */
const names = ["علي","رائد","سيف","مروان","كريم","هيثم"];
const texts = ["استمر", "أبدعت", "عمل رائع", "جميل", "ممتاز"];
const emojis = ["🔥","👍"];

function addComment() {
    const name = names[Math.floor(Math.random()*names.length)];
    const msg = texts[Math.floor(Math.random()*texts.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*2)] : "";

    const div = document.createElement("div");
    div.className = "comment";
    div.textContent = `${name}: ${msg} ${emoji}`;

    commentsBox.appendChild(div);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}
setInterval(addComment, 2200);

/* ============================
   VIEWERS (tu versión)
============================ */
let viewers = 51824;
setInterval(() => {
    viewers += Math.floor(Math.random() * 25);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
