import { useEffect, useRef, useState } from "react";

// Sync-settings modal.
//
// Once credentials are saved it shows a "connected" summary (no empty fields to
// retype) — you enter the Gist ID + token once and forget them. Editing is
// behind an explicit "Change credentials". The token value is never rendered
// back into the field (blank = keep existing); it lives in localStorage on this
// device only.
export default function SettingsModal({ open, onClose, gistId, hasToken, status, statusClass, onSave, onClear, onSyncNow }) {
  const [editing, setEditing] = useState(false);
  const [gistInput, setGistInput] = useState(gistId || "");
  const [tokenInput, setTokenInput] = useState("");
  const gistRef = useRef(null);

  const connected = !!(gistId && hasToken);

  // On open: show the summary if connected, else jump straight to the form.
  useEffect(() => {
    if (!open) return;
    setEditing(!connected);
    setGistInput(gistId || "");
    setTokenInput("");
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, connected, gistId, onClose]);

  // Focus the first field whenever the form is shown.
  useEffect(() => {
    if (open && (editing || !connected)) {
      const t = setTimeout(() => gistRef.current && gistRef.current.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open, editing, connected]);

  if (!open) return null;

  const showForm = editing || !connected;

  const submit = (e) => {
    e.preventDefault();
    onSave({ gistId: gistInput, token: tokenInput });
    setTokenInput("");
    if (connected) setEditing(false); // back to the summary after editing
  };

  const disconnect = () => {
    onClear();
    setGistInput("");
    setTokenInput("");
    setEditing(true);
  };

  const shortId = gistId && gistId.length > 14 ? `${gistId.slice(0, 8)}…${gistId.slice(-4)}` : gistId;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="disp modal-title">Cross-device sync</h2>
        <p className="mono modal-sub">Private GitHub Gist as the database.</p>

        {showForm ? (
          <form onSubmit={submit}>
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
              {connected ? (
                <button type="button" className="mono btn" onClick={() => setEditing(false)}>Cancel</button>
              ) : (
                <button type="button" className="mono btn" onClick={onClose}>Close</button>
              )}
            </div>
          </form>
        ) : (
          <>
            <div className="conn">
              <div className="mono conn-row">
                <span className="conn-key">status</span>
                <span className={`conn-val ${statusClass || ""}`}>{status}</span>
              </div>
              <div className="mono conn-row">
                <span className="conn-key">gist</span>
                <span className="conn-val">{shortId}</span>
              </div>
              <div className="mono conn-row">
                <span className="conn-key">token</span>
                <span className="conn-val">✓ saved on this device</span>
              </div>
            </div>
            <p className="mono modal-note">Saved here — no need to re-enter. Changes sync automatically across your devices.</p>

            <div className="modal-actions">
              <button type="button" className="mono btn btn-primary" onClick={onSyncNow}>Sync now</button>
              <button type="button" className="mono btn" onClick={() => setEditing(true)}>Change credentials</button>
              <button type="button" className="mono btn" onClick={onClose}>Close</button>
              <button type="button" className="mono btn btn-danger" onClick={disconnect}>Disconnect</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
