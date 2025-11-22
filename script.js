/* ============================================
   ELEMENTOS
============================================ */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

let currentStream = null;
let recordingStream = null;      // Stream que se graba
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;
let isRecording = false;

video.muted = true; // evitamos el eco pero se graba sonido

/* ============================================
   INICIAR CÁMARA — SOLO VÍDEO, SIN CANVAS
============================================ */
async function startCamera() {
    // Si ya existe un stream, lo paramos
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    // Pedimos cámara nativa
    currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment",
            width: { ideal: 1080 },
            height: { ideal: 1920 }
        },
        audio: true
    });

    // Mostramos en pantalla
    video.srcObject = currentStream;

    // Sacamos la nueva pista de vídeo
    const newVideoTrack = currentStream.getVideoTracks()[0];
    const newAudioTrack = currentStream.getAudioTracks()[0];

    // Primera vez
    if (!recordingStream) {
        recordingStream = new MediaStream([newVideoTrack, newAudioTrack]);
        return;
    }

    // Si ya está entrando en MediaRecorder, sustituimos la pista
    const oldVideoTrack = recordingStream.getVideoTracks()[0];

    recordingStream.removeTrack(oldVideoTrack);
    recordingStream.addTrack(newVideoTrack);

    // NO paramos oldVideoTrack → evita que se corte la grabación
}

startCamera();

/* ============================================
   GRABACIÓN: SOLO STREAM NATIVO
============================================ */
recBtn.onclick = () => {
    if (!isRecording) startRecording();
    else stopRecording();
};

function startRecording() {
    recordedChunks = [];
    isRecording = true;

    /* ————————————————
       TRUCO PARA FORZAR VERTICAL:
       Creamos un nuevo MediaStream y marcamos
       la pista de vídeo como "portrait".
       Safari usa esto para grabar vertical.
    ———————————————— */

    const videoTrack = recordingStream.getVideoTracks()[0];
    const audioTrack = recordingStream.getAudioTracks()[0];

    try {
        videoTrack.applyConstraints({
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: 9/16
        });
    } catch(e) {
        console.log("Safari ignoró las constraints (normal).");
    }

    // MediaRecorder directamente del stream nativo
    mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 6_000_000
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start(200);

    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");
}

function stopRecording() {
    isRecording = false;
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");

    mediaRecorder.stop();
}

/* ============================================
   GUARDAR WEBM VERTICAL
============================================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream_vertical.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* ============================================
   CAMBIAR CÁMARA SIN CORTAR
============================================ */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();

    if (isRecording && mediaRecorder.state === "recording") {
        // Minipausa para evitar tirones
        mediaRecorder.pause();
        setTimeout(() => {
            mediaRecorder.resume();
        }, 100);
    }
};

/* ============================================
   COMENTARIOS
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
