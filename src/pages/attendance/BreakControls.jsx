import React, { useEffect, useMemo, useState } from "react";
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getMyStatus,
} from "../../api/attendance";

export default function BreakControls() {
  const [status, setStatus] = useState({ loading: true, open: false, attendance: null });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setError("");
      const data = await getMyStatus();
      setStatus({ loading: false, open: data.open, attendance: data.attendance });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setStatus(s => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCheckIn = async () => {
    try {
      setError("");
      await checkIn(note || undefined);
      setNote("");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const onStartBreak = async () => {
    try {
      setError("");
      await startBreak(note || undefined);
      setNote("");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const onEndBreak = async () => {
    try {
      setError("");
      await endBreak();
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const onCheckOut = async () => {
    try {
      setError("");
      await checkOut();
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const open = status.open;
  const attendance = status.attendance;
  const onBreakFlag = useMemo(() => Boolean(attendance?.onBreak), [attendance]);

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <h2 style={{ marginTop: 0 }}>Attendance</h2>

      <div className="form-group">
        <label>Note (optional)</label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Starting break / late bus / etc."
        />
      </div>

      {error ? (
        <div className="status-message error" style={{ marginBottom: 16 }}>{error}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!open && (
          <button className="submit-btn" onClick={onCheckIn} disabled={status.loading}>
            Check In
          </button>
        )}

        {open && !onBreakFlag && (
          <button className="edit-btn" onClick={onStartBreak} disabled={status.loading}>
            Start Break
          </button>
        )}

        {open && onBreakFlag && (
          <button className="edit-btn" onClick={onEndBreak} disabled={status.loading}>
            End Break
          </button>
        )}

        {open && (
          <button
            className="delete-btn"
            onClick={onCheckOut}
            disabled={status.loading}
            title={onBreakFlag ? "You’re on a break. We will auto end the break and then check out." : ""}
          >
            Check Out
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 14, color: "#42526e" }}>
        {status.loading ? "Loading status…" : (
          open ? (
            <>
              <div><strong>Status:</strong> {onBreakFlag ? "On Break" : "Working"}</div>
              <div><strong>Checked in:</strong> {new Date(attendance.checkInAt).toLocaleString()}</div>
              {attendance.breaks?.length ? (
                <div style={{ marginTop: 8 }}>
                  <strong>Breaks:</strong>
                  <ul style={{ margin: "8px 0 0 18px" }}>
                    {attendance.breaks.map((b, i) => (
                      <li key={i}>
                        {new Date(b.startAt).toLocaleTimeString()} – {b.endAt ? new Date(b.endAt).toLocaleTimeString() : "…"}
                        {typeof b.minutes === "number" && b.minutes > 0 ? ` (${b.minutes} min)` : ""}
                        {b.note ? ` — ${b.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            "You’re currently not checked in."
          )
        )}
      </div>
    </div>
  );
}
