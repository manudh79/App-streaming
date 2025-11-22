/* ============================================
   ELEMENTOS
============================================ */
const video = document.getElementById("video");
const recBtn = document.getElementById("recBtn");
const camBtn = document.getElementById("camBtn");
const liveIcon = document.getElementById("liveIcon");
const commentsBox = document.getElementById("comments");
const viewersNumber = document.getElementById("viewersNumber");

// Canvas OCULTO que ya tienes en el HTML
const recordCanvas = document.getElementById("recordCanvas");
const ctx = recordCanvas.getContext("2d");

let videoStream = null;   // solo vídeo
let audioStream = null;   // solo audio
let mediaRecorder = null;
let recordedChunks = [];
let usingFront = false;
let isRecording = false;

video.muted = true; // no eco en preview

/* ============================================
   INICIAR CÁMARA (VÍDEO SOLO)
============================================ */
async function startVideoStream() {
    if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
    }

    videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: usingFront ? "user" : "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    });

    video.srcObject = videoStream;
    await video.play();
}

/* AUDIO SEPARADO (NO TOCAR NUNCA PARA EVITAR CORTES) */
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
    console.error("Error iniciando vídeo:", err);
    alert("Activa permisos de cámara");
});

/* ============================================
   LOOP DE DIBUJO AL CANVAS (SOLO VÍDEO)
============================================ */
function drawToCanvas() {
    if (!isRecording) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
        requestAnimationFrame(drawToCanvas);
        return;
    }

    // Queremos SALIDA VERTICAL SIEMPRE
    const isFrameVertical = vh >= vw;

    if (isFrameVertical) {
        // Frame ya viene vertical (ej. 1080x1920)
        recordCanvas.width = vw;
        recordCanvas.height = vh;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(video, 0, 0, recordCanvas.width, recordCanvas.height);
    } else {
        // Frame ancho (ej. 1920x1080) → giramos 90º para tener vídeo vertical
        recordCanvas.width = vh;
        recordCanvas.height = vw;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.translate(recordCanvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(video, 0, 0, vw, vh);
        ctx.restore();
    }

    // NO DIBUJAMOS OVERLAY AQUÍ → VÍDEO LIMPIO
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

    // Stream del canvas a 30fps
    const canvasStream = recordCanvas.captureStream(30);

    // Añadimos SOLO el audio del micro
    const audioTrack = audioStream.getAudioTracks()[0];
    if (audioTrack) {
        canvasStream.addTrack(audioTrack);
    }

    // MediaRecorder alta calidad WEBM
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
        videoBitsPerSecond: 10_000_000 // pedimos buen bitrate
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = saveRecording;

    mediaRecorder.start(200);
    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");

    requestAnimationFrame(drawToCanvas);
}

function stopRecording() {
    isRecording = false;
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }
}

/* ============================================
   GUARDAR ARCHIVO
============================================ */
function saveRecording() {
    const blob = new Blob(recordedChunks, {
        type: recordedChunks[0]?.type || "video/webm"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kalal_vertical_clean.webm";
    a.click();
    URL.revokeObjectURL(url);
}

/* ============================================
   CAMBIAR CÁMARA SIN CORTAR GRABACIÓN
============================================ */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    // Solo cambiamos el vídeo de la preview; el recorder sigue con el canvas
    await startVideoStream();
};

/* ============================================
   COMENTARIOS EN ÁRABE (SOLO UI)
============================================ */
const names = ["علي","رائد","سيف","مروان","كريم","هيثم"];
const texts = ["استمر", "أبدعت", "عمل رائع", "جميل", "ممتاز"];
const emojis = ["🔥","👍"];

function addComment() {
    const name = names[Math.floor(Math.random()*names.length)];
    const msg  = texts[Math.floor(Math.random()*texts.length)];
    const emoji = Math.random() < 0.4 ? emojis[Math.floor(Math.random()*emojis.length)] : "";

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
   VIEWERS (SOLO UI)
============================================ */
let viewers = 52380;
setInterval(() => {
    viewers += Math.floor(Math.random() * 20);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
