import React from "react";

const inline = (text) =>
  text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith("`") && t.endsWith("`") && t.length > 1 ? <code key={i}>{t.slice(1, -1)}</code>
      : t.startsWith("**") && t.endsWith("**") ? <strong key={i}>{t.slice(2, -2)}</strong> : t);

/** Small, safe Markdown renderer for journal entries (no HTML passthrough). */
export function Markdown({source}) {
  const out = [];
  let list = null, code = null;
  const flush = () => { if (list) { out.push(<ul key={out.length}>{list}</ul>); list = null; } };
  source.split("\n").forEach((line, i) => {
    if (code) {
      if (/^```/.test(line)) { out.push(<pre key={i}><code>{code.join("\n")}</code></pre>); code = null; }
      else code.push(line);
      return;
    }
    if (/^```/.test(line)) { flush(); code = []; return; }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { flush(); const T = `h${Math.min(4, h[1].length + 2)}`; out.push(<T key={i}>{inline(h[2])}</T>); return; }
    const task = line.match(/^\s*[-*]\s\[([ xX])\]\s?(.*)/);
    if (task) { (list ??= []).push(<li key={i} className={`md-task ${task[1] !== " " ? "done" : ""}`}>{inline(task[2])}</li>); return; }
    const li = line.match(/^\s*[-*]\s(.*)/);
    if (li) { (list ??= []).push(<li key={i}>{inline(li[1])}</li>); return; }
    flush();
    if (/^>\s?/.test(line)) out.push(<blockquote key={i}>{inline(line.replace(/^>\s?/, ""))}</blockquote>);
    else if (line.trim()) out.push(<p key={i}>{inline(line)}</p>);
  });
  if (code) out.push(<pre key="c"><code>{code.join("\n")}</code></pre>);
  flush();
  return <div className="md">{out}</div>;
}
