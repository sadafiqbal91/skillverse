// 📷 Photo ko browser mein hi chhota karo (3 MB → ~200 KB), PDF waisa hi
const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const compressImage = (file, max = 1280, quality = 0.75) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("This photo could not be opened. Try another one."));
    img.src = url;
  });

export const prepareUpload = async (file) => {
  if (file.type.startsWith("image/")) {
    return { data: await compressImage(file), name: file.name.replace(/\.\w+$/, "") + ".jpg", type: "image/jpeg" };
  }
  if (file.type === "application/pdf") {
    if (file.size > 4 * 1024 * 1024) throw new Error("PDF must be under 4 MB");
    return { data: await readAsDataUrl(file), name: file.name, type: file.type };
  }
  throw new Error("Please choose a photo or a PDF");
};

// PDF ko naye tab mein kholo
export const openFile = async (dataUrl) => {
  const blob = await (await fetch(dataUrl)).blob();
  window.open(URL.createObjectURL(blob), "_blank");
};