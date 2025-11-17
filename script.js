let video = document.getElementById("video");
let recBtn = document.getElementById("recBtn");
let camBtn = document.getElementById("camBtn");
let liveContainer = document.getElementById("liveContainer");
let commentsBox = document.getElementById("comments");

let currentStream;
let usingFrontCamera = false;
let mediaRecorder;
let chunks = [];

/* =======================
   START CAMERA (BACK FIRST)
======================= */
async function startCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
    }

    let constraints = {
        audio: false,     // NO ECO
        video: {
            facingMode: usingFrontCamera ? "user" : "environment"
        }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
}

startCamera();

/* =======================
   CAMERA SWITCH
======================= */
camBtn.addEventListener("click", () => {
    usingFrontCamera = !usingFrontCamera;
    startCamera();
});

/* =======================
   RECORDING
======================= */
recBtn.addEventListener("click", () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        
        liveContainer.style.display = "block";

        mediaRecorder = new MediaRecorder(currentStream, {
            mimeType: "video/webm"
        });

        chunks = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        mediaRecorder.onstop = () => {
            liveContainer.style.display = "none";

            let blob = new Blob(chunks, { type: "video/mp4" });
            let url = URL.createObjectURL(blob);

            let a = document.createElement("a");
            a.href = url;
            a.download = "stream.mp4";
            document.body.appendChild(a);
            a.click();
            a.remove();
        };

        mediaRecorder.start();
    } 
    else {
        mediaRecorder.stop();
    }
});

/* =======================
   COMMENTS SYSTEM
======================= */

const names = ["رائد","علي","كريم","مروان","هيثم","سيف"];
const comments = ["رائع","عمل رائع","ممتاز","أحسنت","استمر"];

function addComment() {

    let name = names[Math.floor(Math.random() * names.length)];
    let text = comments[Math.floor(Math.random() * comments.length)];

    let el = document.createElement("div");
    el.className = "comment";
    el.textContent = `${name}: ${text}`;

    commentsBox.appendChild(el);

    if (commentsBox.children.length > 6) {
        commentsBox.removeChild(commentsBox.children[0]);
    }
}

setInterval(addComment, 2000);
