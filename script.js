/* ============================================
   ELEMENTOS
============================================ */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

const recordCanvas = document.getElementById("recordCanvas");
const ctx = recordCanvas.getContext("2d");

let videoStream = null;   
let audioStream = null;   
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;
let isRecording = false;

video.muted = true;

/* ============================================
   INICIAR VIDEO A 60 FPS
============================================ */
async function startVideoStream() {
    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
    }

    videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60, max: 60 }
        },
        audio: false
    });

    video.srcObject = videoStream;
    await video.play();
}

/* AUDIO (separado para evitar cortes) */
async function ensureAudioStream() {
    if (!audioStream) {
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            },
            video: false
        });
    }
}

startVideoStream().catch(err => {
    alert("Activa permisos de cámara");
});

/* ============================================
   DIBUJAR EN CANVAS A 60 FPS
============================================ */
function drawToCanvas() {
    if (!isRecording) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
        requestAnimationFrame(drawToCanvas);
        return;
    }

    const vertical = vh >= vw;

    if (vertical) {
        recordCanvas.width = vw;
        recordCanvas.height = vh;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(video, 0, 0, vw, vh);
    } else {
        recordCanvas.width = vh;
        recordCanvas.height = vw;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.translate(recordCanvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(video, 0, 0, vw, vh);
        ctx.restore();
    }

    requestAnimationFrame(drawToCanvas);
}

/* ============================================
   EMPEZAR / PARAR GRABACIÓN
============================================ */
recBtn.onclick = () => {
    if (!isRecording) startRecording();
    else stopRecording();
};

async function startRecording() {
    await ensureAudioStream();

    recordedChunks = [];
    isRecording = true;

    const canvasStream = recordCanvas.captureStream(60); // 🔥 60 FPS

    const audioTrack = audioStream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    let options = {};

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        options.mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        options.mimeType = "video/webm;codecs=vp8";
    } else {
        options.mimeType = "video/webm";
    }

    mediaRecorder = new MediaRecorder(canvasStream, {
        ...options,
        videoBitsPerSecond: 12_000_000  // 🔥 bitrate alto
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start(100);
    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    requestAnimationFrame(drawToCanvas);
}

function stopRecording() {
    isRecording = false;
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");
    mediaRecorder.stop();
}

/* ============================================
   DESCARGAR ARCHIVO FINAL
============================================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "kalal_60fps_vertical.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* ============================================
   CAMBIAR CÁMARA (NO CORTA GRABACIÓN)
============================================ */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startVideoStream();
};

/* ============================================
   COMENTARIOS EN ÁRABE
============================================ */
const names = ["علي","رائد","سيف","مروان","كريم","هيثم"];
const texts = ["استمر", "أبدعت", "عمل رائع", "جميل", "ممتاز"];
const emojis = ["🔥","👍"];

function addComment() {
    const name = names[Math.floor(Math.random()*names.length)];
    const msg  = texts[Math.floor(Math.random()*texts.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*2)] : "";

    const div = document.createElement("div");
    div.className = "comment";
    div.textContent = `${name}: ${msg} ${emoji}`;

    commentsBox.appendChild(div);

    if (commentsBox.children.length > 6)
        commentsBox.removeChild(commentsBox.children[0]);
}

setInterval(addComment, 2200);

/* ============================================
   VIEWERS
============================================ */
let viewers = 52380;
setInterval(() => {
    viewers += Math.floor(Math.random() * 20);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
