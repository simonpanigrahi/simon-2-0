import { useEffect, useRef, useState } from "react";

// Sync-settings modal. Collects the Gist ID + PAT and hands them to the sync
// layer, which stores them in localStorage ON THIS DEVICE ONLY. The token value
// is never rendered back into the field once saved (blank = keep existing).
export default function SettingsModal({ open, onClose, gistId, hasToken, status, onSave, onClear, onSyncNow }) {
  const [gistInput, setGistInput] = useState(gistId || "");
  const [tokenInput, setTokenInput] = useState("");
  const gistRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setGistInput(gistId || "");
    setTokenInput("");
    const t = setTimeout(() => gistRef.current && gistRef.current.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, gistId, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    onSave({ gistId: gistInput, token: tokenInput });
    setTokenInput("");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="settings-title" className="disp modal-title">Cross-device sync</h2>
        <p className="mono modal-sub">Private GitHub Gist as the database.</p>

        <label className="mono field-label" htmlFor="gist-id">Gist ID</label>
        <input
          id="gist-id"
          ref={gistRef}
          className="mono field-input"
          type="text"
          value={gistInput}
          onChange={(e) => setGistInput(e.target.value)}
          placeholder="e.g. 3f9c…"
          autoComplete="off"
          spellCheck="false"
        />

        <label className="mono field-label" htmlFor="gist-token">
          Token {hasToken && <span className="field-hint">· saved — leave blank to keep</span>}
        </label>
        <input
          id="gist-token"
          className="mono field-input"
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder={hasToken ? "•••••••••• (keep)" : "fine-grained PAT · gist read/write"}
          autoComplete="off"
          spellCheck="false"
        />

        <p className="mono modal-note">🔒 Stored only on this device. Never committed, logged, or exported.</p>

        <div className="mono modal-status">status · {status}</div>

        <div className="modal-actions">
          <button type="submit" className="mono btn btn-primary">Save</button>
          <button type="button" className="mono btn" onClick={onSyncNow} disabled={!hasToken}>Sync now</button>
          <button type="button" className="mono btn" onClick={onClose}>Close</button>
          {hasToken && (
            <button type="button" className="mono btn btn-danger" onClick={onClear}>Clear credentials</button>
          )}
        </div>
      </form>
    </div>
  );
}
