/** Download an image (data URL or cross-origin URL) under a filename. */
export async function downloadImage(src: string, filename: string): Promise<void> {
  if (src.startsWith("data:")) {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
  } catch {
    window.open(src, "_blank", "noopener");
  }
}

/** Copy arbitrary text to the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share a link: use the native share sheet when available, otherwise
 * copy the URL. Returns the method used, or null if the user cancelled.
 */
export async function shareLink(opts: {
  title: string;
  text: string;
  url: string;
}): Promise<"share" | "copy" | null> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
      return "share";
    } catch {
      /* user cancelled the sheet — fall through to copy */
    }
  }
  const ok = await copyText(opts.url);
  return ok ? "copy" : null;
}

/** Turn a maison name into a URL-safe slug. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "maison"
  );
}
