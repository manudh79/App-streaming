let mediaStream = null;
let recorder = null;
let recordedChunks = [];
let usingFrontCamera = false;
let recordingStream = null;

/* ========= INICIAR CÁMARA ========= */
async function startCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: usingFrontCamera ? "user" : "environment" },
        audio: true
    });

    document.getElementById("video").srcObject = mediaStream;

    if (!recordingStream) {
        recordingStream = new MediaStream([
            mediaStream.getVideoTracks()[0],
            mediaStream.getAudioTracks()[0]
        ]);
    } else {
        const newVideoTrack = mediaStream.getVideoTracks()[0];
        const oldTrack = recordingStream.getVideoTracks()[0];

        recordingStream.removeTrack(oldTrack);
        oldTrack.stop();

        recordingStream.addTrack(newVideoTrack);
    }
}

/* ========= CAMBIAR CÁMARA SIN CORTAR GRABACIÓN ========= */
async function switchCamera() {
    usingFrontCamera = !usingFrontCamera;
    await startCamera();
}

/* ========= INICIAR GRABACIÓN ========= */
function startRecording() {
    recordedChunks = [];

    recorder = new MediaRecorder(recordingStream, {
        mimeType: "video/webm;codecs=vp9"
    });

    recorder.ondataavailable = e => recordedChunks.push(e.data);

    recorder.onstop = saveRecording;

    recorder.start();
    document.getElementById("liveIcon").style.display = "block";
}

/* ========= PARAR GRABACIÓN ========= */
function stopRecording() {
    recorder.stop();
    document.getElementById("liveIcon").style.display = "none";
}

/* ========= GUARDAR ARCHIVO ========= */
function saveRecording() {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "recording.webm";
    a.click();

    URL.revokeObjectURL(url);
}

/* ========= EVENTOS ========= */
document.getElementById("recBtn").onclick = () => {
    if (!recorder || recorder.state === "inactive") {
        startRecording();
    } else {
        stopRecording();
    }
};

document.getElementById("switchBtn").onclick = switchCamera;

/* ========= INICIAR TODO ========= */
startCamera();
