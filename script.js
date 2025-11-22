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
let recordingStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;
let isRecording = false;

video.muted = true; // 🔇 SIN ECO, PERO SE GRABA AUDIO

/* ============================================
   INICIAR CÁMARA
============================================ */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: true
    });

    video.srcObject = currentStream;

    const newVideoTrack = currentStream.getVideoTracks()[0];

    if (!recordingStream) {
        recordingStream = new MediaStream([
            newVideoTrack,
            currentStream.getAudioTracks()[0]
        ]);
    } else {
        const oldTrack = recordingStream.getVideoTracks()[0];
        recordingStream.removeTrack(oldTrack);
        // ❗ NO detener oldTrack para que no corte la grabación
        recordingStream.addTrack(newVideoTrack);
    }
}

startCamera();

/* ============================================
   CREAR CANVAS PARA GRABAR OVERLAYS
============================================ */
let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
canvas.style.display = "none"; // nunca visible
document.body.appendChild(canvas);

/* ============================================
   LOOP QUE DIBUJA EN EL CANVAS
============================================ */
function drawCanvasFrame() {
    if (!isRecording) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) {
        requestAnimationFrame(drawCanvasFrame);
        return;
    }

    // Ajustar canvas a resolución nativa de la cámara
    canvas.width = vw;
    canvas.height = vh;

    // --- Dibuja vídeo ---
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // --- Obtener posiciones exactas desde la pantalla ---
    const rectVideo = video.getBoundingClientRect();

    function drawElement(id) {
        const el = document.getElementById(id);
        if (!el) return;

        const r = el.getBoundingClientRect();
        const x = (r.left - rectVideo.left) * (vw / rectVideo.width);
        const y = (r.top - rectVideo.top) * (vh / rectVideo.height);
        const w = r.width * (vw / rectVideo.width);
        const h = r.height * (vh / rectVideo.height);

        if (el.tagName === "IMG") {
            ctx.drawImage(el, x, y, w, h);
        } else {
            ctx.font = `${h * 0.8}px Arial`;
            ctx.fillStyle = "white";
            ctx.fillText(el.innerText, x, y + h);
        }
    }

    // Overlays principales
    drawElement("userIcon");
    drawElement("eyeIcon");
    drawElement("viewersNumber");
    drawElement("viewersLabel");
    if (liveIcon.style.display !== "none") drawElement("liveIcon");

    // Comentarios
    Array.from(commentsBox.children).forEach(comment => {
        const r = comment.getBoundingClientRect();
        const x = (r.left - rectVideo.left) * (vw / rectVideo.width);
        const y = (r.top - rectVideo.top) * (vh / rectVideo.height);
        ctx.font = `${r.height * (vw / rectVideo.width) * 0.75}px Arial`;
        ctx.fillStyle = "white";
        ctx.fillText(comment.innerText, x, y);
    });

    // Iconos inferiores
    drawElement("recBtn");
    drawElement("camBtn");
    drawElement("heartBtn");

    requestAnimationFrame(drawCanvasFrame);
}

/* ============================================
   EMPIEZA GRABACIÓN
============================================ */
function startRecording() {
    recordedChunks = [];

    // Obtener stream del canvas (con audio del micrófono)
    const canvasStream = canvas.captureStream(30);
    const audioTrack = recordingStream.getAudioTracks()[0];
    canvasStream.addTrack(audioTrack);

    mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start();
    isRecording = true;

    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    requestAnimationFrame(drawCanvasFrame);
}

/* ============================================
   STOP GRABACIÓN
============================================ */
function stopRecording() {
    isRecording = false;
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");
    mediaRecorder.stop();
}

/* ============================================
   GUARDAR ARCHIVO
============================================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream_recording.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* ============================================
   BOTONES
============================================ */
recBtn.onclick = () => !isRecording ? startRecording() : stopRecording();

camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* ============================================
   COMENTARIOS
============================================ */
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
    if (commentsBox.children.length > 6) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
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
