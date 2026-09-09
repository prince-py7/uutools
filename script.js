const form = document.getElementById("form");
const uuidInput = document.getElementById("uuid");
const enterButton = document.getElementById("enter");
const statusText = document.getElementById("status");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const foundUuid = document.getElementById("foundUuid");
const image = document.getElementById("image");
const download = document.getElementById("download");
const retry = document.getElementById("retry");

let currentImageUrl = "";
let currentUuid = "";

function showLoading() {
  loading.classList.remove("hidden");
  result.classList.add("hidden");
  statusText.textContent = "";
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showForm() {
  form.classList.remove("hidden");
  result.classList.add("hidden");
  statusText.textContent = "";
  hideLoading();
  image.removeAttribute("src");
  currentImageUrl = "";
  currentUuid = "";
  uuidInput.value = "";
  uuidInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const uuid = uuidInput.value.trim();

  if (!uuid) {
    statusText.textContent = "Image not available";
    return;
  }

  if (!IMAGE_API_URL || IMAGE_API_URL === "PASTE_YOUR_API_URL_HERE") {
    statusText.textContent = "Image not available";
    return;
  }

  const url =
    IMAGE_API_URL.replace(/\/$/, "") +
    "/" +
    encodeURIComponent(uuid) +
    "?t=" +
    Date.now();

  currentUuid = uuid;
  currentImageUrl = url;

  enterButton.disabled = true;
  form.classList.add("hidden");
  showLoading();

  image.onload = () => {
    hideLoading();
    foundUuid.textContent = currentUuid;
    result.classList.remove("hidden");
    statusText.textContent = "";
    enterButton.disabled = false;
  };

  image.onerror = () => {
    hideLoading();
    form.classList.remove("hidden");
    result.classList.add("hidden");
    statusText.textContent = "Image not available";
    enterButton.disabled = false;
  };

  image.src = url;
});

download.addEventListener("click", async () => {
  if (!currentImageUrl) {
    return;
  }

  // Cross-origin APIs often block <a download>, so open/save via blob when possible.
  try {
    const response = await fetch(currentImageUrl, { mode: "cors", cache: "no-store" });
    if (!response.ok) {
      throw new Error("fetch failed");
    }
    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error("empty blob");
    }
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `profile-${currentUuid || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    // Fallback: open image URL so user can save it.
    window.open(currentImageUrl, "_blank");
  }
});

retry.addEventListener("click", () => {
  showForm();
});
