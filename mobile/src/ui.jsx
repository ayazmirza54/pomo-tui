import React from "react";

const P = {
  today: "M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  journal: "M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6V3Zm0 0v18M10 8h5M10 12h5",
  focus: "M12 8v5l3 2M9 2h6M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 5.5l1 1 2-2M4 11.5l1 1 2-2M4 17.5l1 1 2-2",
  insights: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-2-1.2L14.5 2h-4l-.4 2.6a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6 6 18",
  back: "M15 5l-7 7 7 7",
  play: "M8 5v14l11-7L8 5Z",
  pause: "M8 5v14M16 5v14",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z",
  flame: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  skip: "M6 5l9 7-9 7V5Zm12 0v14",
  reset: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4",
  share: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  git: "M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c0 6-6 6-12 9",
};

export const Icon = ({name, size = 20, fill = false, ...p}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d={P[name]} />
  </svg>
);

export const Card = ({title, action, children, className = "", ...p}) => (
  <section className={`card ${className}`} {...p}>
    {(title || action) && (
      <header className="card-head">
        {title && <h2>{title}</h2>}
        {action}
      </header>
    )}
    {children}
  </section>
);

export const Empty = ({children}) => <p className="empty">{children}</p>;

export const KIND_LABEL = {note: "note", win: "win", til: "TIL", blocker: "blocker", bug: "bug", idea: "idea"};
export const KindPill = ({kind}) => <span className={`pill kind-${kind}`}>{KIND_LABEL[kind] || kind}</span>;

/** Highlights #tags inside task text. */
export const TagText = ({text}) =>
  text.split(/(#[\w-]+)/g).map((part, i) => (part.startsWith("#") ? <span key={i} className="tag">{part}</span> : part));
