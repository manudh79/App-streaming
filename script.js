const video = document.getElementById("camera");
const recBtn = document.getElementById("rec-btn");
const camBtn = document.getElementById("cam-btn");
const liveBadge = document.getElementById("live-badge");
const commentsBox = document.getElementById("comments");
const viewersCount = document.getElementById("viewers-count");

let mediaRecorder;
let chunks = [];
let recording = false;
let currentFacing = "user";

video.muted = true;
video.setAttribute("muted", "true");

let currentStream = null;

async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacing },
        audio: true
    });

    video.srcObject = currentStream;

    mediaRecorder = new MediaRecorder(currentStream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);

    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        chunks = [];

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stream.mp4";
        a.click();
    };
}

startCamera();

/* SWITCH CAMERA */
camBtn.onclick = async () => {
    currentFacing = currentFacing === "user" ? "environment" : "user";
    await startCamera();
};

/* RECORD */
recBtn.onclick = () => {
    if (!recording) {
        mediaRecorder.start();
        recording = true;
        liveBadge.style.display = "block";
    } else {
        mediaRecorder.stop();
        recording = false;
        liveBadge.style.display = "none";
    }
};

/* VIEWERS */
let viewers = 51000;
setInterval(() => {
    viewers += Math.floor(Math.random() * 8);
    viewersCount.textContent = viewers.toLocaleString("en-US");
}, 1500);

/* COMMENTS */
const comments = [
    "سامر: أنت بطل 👍",
    "علي: ممتاز",
    "كريم: عمل رائع",
    "مروان: أحسنت 👍",
    "هيثم: رائع 🔥"
];

setInterval(() => {
    const c = document.createElement("div");
    c.textContent = comments[Math.floor(Math.random() * comments.length)];

    commentsBox.appendChild(c);

    if (commentsBox.children.length > 5) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}, 2300);
