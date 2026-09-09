const form = document.getElementById("form");
const uuidInput = document.getElementById("uuid");
const enterButton = document.getElementById("enter");
const statusText = document.getElementById("status");
const loading = document.getElementById("loading");
const loadingBarFill = document.getElementById("loadingBarFill");
const loadingText = document.getElementById("loadingText");
const result = document.getElementById("result");
const foundUuid = document.getElementById("foundUuid");
const image = document.getElementById("image");
const download = document.getElementById("download");
const retry = document.getElementById("retry");

let currentImageUrl = "";
let currentUuid = "";
let objectUrl = "";
let activeRequest = null;
let fakeProgressTimer = null;

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, Math.floor(percent)));
  loadingBarFill.style.width = value + "%";
  loadingText.textContent = "Loading Image " + value + "%";
}

function clearFakeProgress() {
  if (fakeProgressTimer) {
    clearInterval(fakeProgressTimer);
    fakeProgressTimer = null;
  }
}

function startFakeProgress() {
  clearFakeProgress();
  let value = 0;
  setProgress(0);
  fakeProgressTimer = setInterval(() => {
    if (value >= 90) {
      return;
    }
    value += Math.max(1, Math.round((90 - value) / 12));
    setProgress(value);
  }, 180);
}

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  }
}

function showLoading() {
  loading.classList.remove("hidden");
  result.classList.add("hidden");
  statusText.textContent = "";
  setProgress(0);
}

function hideLoading() {
  clearFakeProgress();
  loading.classList.add("hidden");
}

function failLoad() {
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
  }
  hideLoading();
  form.classList.remove("hidden");
  result.classList.add("hidden");
  statusText.textContent = "Image not available";
  enterButton.disabled = false;
}

function showResult(imageSrc, downloadSrc) {
  clearFakeProgress();
  setProgress(100);

  image.onload = () => {
    hideLoading();
    foundUuid.textContent = currentUuid;
    currentImageUrl = downloadSrc;
    result.classList.remove("hidden");
    statusText.textContent = "";
    enterButton.disabled = false;
  };

  image.onerror = () => {
    failLoad();
  };

  image.src = imageSrc;
}

function showForm() {
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
  }
  clearFakeProgress();
  form.classList.remove("hidden");
  result.classList.add("hidden");
  statusText.textContent = "";
  hideLoading();
  image.removeAttribute("src");
  revokeObjectUrl();
  currentImageUrl = "";
  currentUuid = "";
  uuidInput.value = "";
  uuidInput.focus();
}

function loadWithXhr(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    activeRequest = xhr;
    xhr.open("GET", url, true);
    xhr.responseType = "blob";

    xhr.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        clearFakeProgress();
        setProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      activeRequest = null;
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response && xhr.response.size > 0) {
        resolve(xhr.response);
      } else {
        reject(new Error("empty"));
      }
    };

    xhr.onerror = () => {
      activeRequest = null;
      reject(new Error("network"));
    };

    xhr.onabort = () => {
      activeRequest = null;
      reject(new Error("abort"));
    };

    xhr.send();
  });
}

function loadWithImageTag(url) {
  startFakeProgress();

  return new Promise((resolve, reject) => {
    const probe = new Image();
    probe.onload = () => resolve(url);
    probe.onerror = () => reject(new Error("image"));
    probe.src = url;
  });
}

form.addEventListener("submit", async (event) => {
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
  revokeObjectUrl();

  enterButton.disabled = true;
  form.classList.add("hidden");
  showLoading();
  startFakeProgress();

  try {
    const blob = await loadWithXhr(url);
    objectUrl = URL.createObjectURL(blob);
    showResult(objectUrl, objectUrl);
  } catch (error) {
    if (error && error.message === "abort") {
      return;
    }

    try {
      const imageSrc = await loadWithImageTag(url);
      showResult(imageSrc, url);
    } catch (imageError) {
      failLoad();
    }
  }
});

download.addEventListener("click", async () => {
  if (!currentImageUrl) {
    return;
  }

  try {
    const response = await fetch(currentImageUrl, { mode: "cors", cache: "no-store" });
    if (!response.ok) {
      throw new Error("fetch failed");
    }
    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error("empty blob");
    }
    const tempUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = tempUrl;
    link.download = `profile-${currentUuid || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(tempUrl), 1000);
  } catch (error) {
    if (currentImageUrl.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = currentImageUrl;
      link.download = `profile-${currentUuid || "image"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    window.open(currentImageUrl, "_blank");
  }
});

retry.addEventListener("click", () => {
  showForm();
});
