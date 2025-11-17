/* =============================
   ELEMENTOS
============================= */
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

/* =============================
   INICIAR CÁMARA
============================= */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    const constraints = {
        video: { facingMode: usingFront ? "user" : "environment" },
        audio: true
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;

    if (!recordingStream) {
        // Primera asignación
        recordingStream = new MediaStream([
            currentStream.getVideoTracks()[0],
            currentStream.getAudioTracks()[0]
        ]);
    } else {
        // ⚠️ IMPORTANTE: NO detener la pista vieja
        // Solo la sustituimos sin cerrar el MediaRecorder
        const newVideoTrack = currentStream.getVideoTracks()[0];
        const oldTrack = recordingStream.getVideoTracks()[0];

        recordingStream.removeTrack(oldTrack);
        recordingStream.addTrack(newVideoTrack);
    }
}

startCamera();

/* =============================
   CAMBIAR CÁMARA SIN CORTAR GRABACIÓN
============================= */
camBtn.onclick = async () => {
    usingFront = !usingFront;
    await startCamera();
};

/* =============================
   INICIAR GRABACIÓN
============================= */
function startRecording() {
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        if (!isRecording) {  
            // Solo descargar si EL USUARIO pulsó STOP
            saveRecording();
        }
    };

    mediaRecorder.start();
    liveIcon.style.display = "block";
    isRecording = true;
}

/* =============================
   PARAR GRABACIÓN (DESCARGA)
============================= */
function stopRecording() {
    isRecording = false;
    mediaRecorder.stop();
    liveIcon.style.display = "none";
}

/* =============================
   GUARDAR EL ARCHIVO
============================= */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stream.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* =============================
   BOTÓN DE REC
============================= */
recBtn.onclick = () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
};

/* =============================
   COMENTARIOS
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
   VIEWERS EN AUMENTO
============================= */
let viewers = 51824;

setInterval(() => {
    viewers += Math.floor(Math.random() * 25);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
