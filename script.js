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

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFront ? "user" : "environment" },
        audio: true
    });

    video.srcObject = currentStream;

    const newVideoTrack = currentStream.getVideoTracks()[0];

    // Primera vez
    if (!recordingStream) {
        recordingStream = new MediaStream([
            newVideoTrack,
            currentStream.getAudioTracks()[0]
        ]);
    } 
    // Cambiando de cámara mientras grabamos
    else {
        const oldVideoTrack = recordingStream.getVideoTracks()[0];
        recordingStream.removeTrack(oldVideoTrack);
        recordingStream.addTrack(newVideoTrack);
        // ⚠️ Importante: NO detener la pista vieja, NO tocar el recorder
    }
}

startCamera();

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
        if (!isRecording) saveRecording();
    };

    mediaRecorder.start();

    isRecording = true;
    liveIcon.style.display = "block";
    liveIcon.classList.add("blink");
}

/* =============================
   PARAR GRABACIÓN
============================= */
function stopRecording() {
    isRecording = false;
    mediaRecorder.stop();
    liveIcon.style.display = "none";
    liveIcon.classList.remove("blink");
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

    URL.revokeObjectURL(url);
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
async function switchCamera() {
    try {
        // Cambiar entre cámara frontal y trasera
        usingFrontCamera = !usingFrontCamera;

        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: usingFrontCamera ? "user" : "environment" },
            audio: true
        });

        const newVideoTrack = newStream.getVideoTracks()[0];

        // SI ESTÁ GRABANDO → sustituimos solo el track de vídeo sin parar la grabación
        if (recording && mediaRecorder && mediaRecorder.state === "recording") {
            const sender = stream
                .getTracks()
                .find(track => track.kind === "video")
                .applyConstraints;

            // Reemplazar track sin detener el recorder
            const oldTrack = stream.getVideoTracks()[0];
            stream.removeTrack(oldTrack);
            stream.addTrack(newVideoTrack);

            // Refrescar el video mostrado
            video.srcObject = null;
            video.srcObject = stream;

        } else {
            // NO está grabando → reemplazar stream completo
            stream.getTracks().forEach(t => t.stop());
            stream = newStream;
            video.srcObject = stream;
        }
    } catch (err) {
        console.error("Error cambiando cámara:", err);
    }
}

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
   VIEWERS
============================= */
let viewers = 51824;

setInterval(() => {
    viewers += Math.floor(Math.random() * 25);
    viewersNumber.textContent = viewers.toLocaleString("en-US");
}, 2500);
