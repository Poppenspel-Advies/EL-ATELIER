import { useState } from "react";

/**
 * Hosted stock video sources (ocean waves). Verified hotlink-friendly:
 * both URLs respond with 206/partial-content so browsers can stream them.
 * If every source fails (offline, blocked CDN, etc.), the component
 * unmounts itself and the CSS sea scene behind it becomes the backdrop.
 */
const SOURCES = [
  {
    src: "https://videos.pexels.com/video-files/856973/856973-hd_1920_1080_25fps.mp4",
    type: "video/mp4",
  },
  {
    src: "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    type: "video/mp4",
  },
];

export default function VideoBackdrop() {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <video
      className="hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setFailed(true)}
    >
      {SOURCES.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}
