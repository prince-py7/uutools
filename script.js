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

image.onerror = () => {
  statusText.textContent = "Image not available";
  preview.classList.add("hidden");
};
image.onload = () => {
  statusText.textContent = "";
  download.href = url;
  download.download = `profile-${uuid}.png`;
  preview.classList.remove("hidden");
};
image.src = url;
    if (!response.ok) {
      throw new Error("Image not available");
    }

    const contentType = response.headers.get("content-type") || "";
    let blob;

    if (contentType.includes("application/json")) {
      const data = await response.json();
      const imageUrl =
        data.imageSrc || data.imageUrl || data.image_url || data.url || data.image;
      if (!imageUrl) {
        throw new Error("Image not available");
      }
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Image not available");
      }
      blob = await imageResponse.blob();
    } else {
      blob = await response.blob();
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    objectUrl = URL.createObjectURL(blob);
    image.onerror = () => {
      statusText.textContent = "Image not available";
      preview.classList.add("hidden");
    };
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
