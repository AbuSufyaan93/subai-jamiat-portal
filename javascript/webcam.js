const webcamElement = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");
const photoElement = document.getElementById("photo");

const webcam = new Webcam(webcamElement, "user", canvasElement, {
  image_format: "png",
  jpeg_quality: 100,
  constraints : {
    width: 1280,
    height:720
  }
});

webcam._snapSoundElement = { play: () => {} }; 

const startBtn = document.getElementById("start");
const captureBtn = document.getElementById("capture");
const retakeBtn = document.getElementById("retake");

let img_base64 = undefined;

startBtn.onclick = async () => {
  await webcam.start();

  webcamElement.style.display = "block";
  photoElement.style.display = "none";
  canvasElement.style.display = "none";

  startBtn.style.display = "none";
  captureBtn.style.display = "inline-block";
  retakeBtn.style.display = "none";
};

captureBtn.onclick = () => {

  const size = Math.min(webcamElement.videoWidth, webcamElement.videoHeight);
  canvasElement.width = size;
  canvasElement.height = size;

  const ctx = canvasElement.getContext('2d');

    // Flip canvas horizontally to match webcam preview
  ctx.save();
  ctx.translate(size, 0);   // move origin to right edge
  ctx.scale(-1, 1);         // flip horizontally

  // Crop center of the video
  const sx = (webcamElement.videoWidth - size) / 2;
  const sy = (webcamElement.videoHeight - size) / 2;

  ctx.drawImage(webcamElement, sx, sy, size, size, 0, 0, size, size);
  ctx.restore(); // reset transform




  let picture =  canvas.toDataURL('image/png');
  img_base64 = picture; //setting base64 in global variable
  webcam.stop();

  photoElement.src = picture;
  photoElement.style.display = "block";

  // hide video + canvas
  webcamElement.style.display = "none";
  canvasElement.style.display = "none";

  captureBtn.style.display = "none";
  retakeBtn.style.display = "inline-block";
};

retakeBtn.onclick = async () => {
  await webcam.start();
  webcamElement.style.display = "block";
  photoElement.style.display = "none";
  canvasElement.style.display = "none";

  retakeBtn.style.display = "none";
  captureBtn.style.display = "inline-block";
};

function dataURLtoBlob(dataURL) {
  let arr = dataURL.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
