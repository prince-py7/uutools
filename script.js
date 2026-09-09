const form = document.getElementById("form");
const uuidInput = document.getElementById("uuid");
const enterButton = document.getElementById("enter");
const statusText = document.getElementById("status");
const preview = document.getElementById("preview");
const image = document.getElementById("image");
const download = document.getElementById("download");

let objectUrl = "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const uuid = uuidInput.value.trim();

  if (!uuid) {
    statusText.textContent = "Image not available";
    preview.classList.add("hidden");
    return;
  }

  if (!IMAGE_API_URL || IMAGE_API_URL === "PASTE_YOUR_API_URL_HERE") {
    statusText.textContent = "Loading Image...";
    preview.classList.add("hidden");
    return;
  }

  enterButton.disabled = true;
  statusText.textContent = "Loading Image...";
  preview.classList.add("hidden");

  try {
  const url = IMAGE_API_URL.replace(/\/$/, "") + "/" + encodeURIComponent(uuid);

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = "";
  }

  image.onload = () => {
    statusText.textContent = "";
    download.href = url;
    download.setAttribute("download", `profile-${uuid}.png`);
    download.setAttribute("target", "_blank");
    preview.classList.remove("hidden");
    enterButton.disabled = false;
  };

  image.onerror = () => {
    statusText.textContent = "Image not available";
    preview.classList.add("hidden");
    enterButton.disabled = false;
  };

  image.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
} catch (error) {
  statusText.textContent = "Image not available";
  preview.classList.add("hidden");
  enterButton.disabled = false;
}
    image.src = objectUrl;
    download.href = objectUrl;
    download.download = `profile-${uuid}.png`;
    preview.classList.remove("hidden");
    statusText.textContent = "";
  } catch (error) {
    statusText.textContent = "Image not available";
    preview.classList.add("hidden");
  } finally {
    enterButton.disabled = false;
  }
});
