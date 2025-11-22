/* =============================
   ELEMENTOS
============================= */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

// Canvas oculto solo para grabar todo lo que aparece en pantalla
const recordCanvas = document.getElementById("recordCanvas");
const ctx = recordCanvas.getContext("2d");

let currentStream = null;
let recordingStream = null;
let canvasStream = null;
let audioTrack = null;
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;
let isRecording = false;

/* =============================
   INICIAR CÁMARA
============================= */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFront ? "user" : "environment" },
        audio: true
    });

    video.srcObject = currentStream;
    audioTrack = currentStream.getAudioTracks()[0];

    const videoTrack = currentStream.getVideoTracks()[0];

    if (!recordingStream) {
        recordingStream = new MediaStream([videoTrack, audioTrack]);
    } else {
        const oldVideo = recordingStream.getVideoTracks()[0];
        recordingStream.removeTrack(oldVideo);
        recordingStream.addTrack(videoTrack);
    }
}

startCamera();

/* =============================
   CANVAS LOOP PARA GRABAR OVERLAYS
============================= */
function drawCanvasFrame() {
    if (!isRecording) return;

    recordCanvas.width = video.videoWidth;
    recordCanvas.height = video.videoHeight;

    // 1. Dibujar el video
    ctx.drawImage(video, 0, 0, recordCanvas.width, recordCanvas.height);

    // 2. Dibujar overlays desde el DOM
    Array.from(document.body.children).forEach(el => {
        if (el.id !== "recordCanvas" && el.id !== "video") {
            ctx.drawImage(el, el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight);
        }
    });

    requestAnimationFrame(drawCanvasFrame);
}

/* =============================
   INICIAR GRABACIÓN
============================= */
function startRecording() {
    recordedChunks = [];

    // Creamos stream del canvas + añadimos audio
    canvasStream = recordCanvas.captureStream(30);
    canvasStream.addTrack(audioTrack);

    mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    isRecording = true;

    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    mediaRecorder.start();
    drawCanvasFrame(); // <--- empieza el loop del canvas
}

/* =============================
   PARAR GRABACIÓN
============================= */
function stopRecording() {
    isRecording = false;

    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");

    mediaRecorder.stop();
}

/* =============================
   GUARDAR ARCHIVO
============================= */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();
}

/* =============================
   BOTÓN REC
============================= */
recBtn.onclick = () => {
    if (!isRecording) startRecording();
    else stopRecording();
};

/* =============================
   CAMBIAR CÁMARA
============================= */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* =============================
   COMENTARIOS (igual que tu versión)
============================= */
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

/* =============================
   VIEWERS
============================= */
let viewers = 51824;

setInterval(() => {
    viewers += Math.floor(Math.random() * 25);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
