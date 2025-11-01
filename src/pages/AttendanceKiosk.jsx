import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input, Button, Spin, message, Modal, Tooltip, Tag } from "antd";
import { fetchEmployeesForKiosk } from "../api/auth";
import { setEmployeeKioskPin } from "../api/auth";
import { fetchCompanies } from "../api/company";
import {
  kioskCheckIn,
  kioskCheckOut,
  kioskStartBreak, // <-- NEW
  kioskEndBreak, // <-- NEW
  listAttendance,
} from "../api/attendance";
import { useAuth } from "../contexts/AuthContext";
import { formatAttendanceTime } from "../utils/timezone";
import { useCompanyAttendanceRules } from "../hooks/useCompanyAttendanceRules";
import { 
  showSuccessToast, 
  showErrorToast, 
  showWarningToast,
  showInfoToast,
  showLoading,
  closeLoading
} from "../utils/sweetAlert";

/* =======================
   Analog Clock (SVG)
   ======================= */
function AnalogClock({ now, timeZone = "UTC", size = 360 }) {
  const { h, m, s } = useMemo(() => {
    try {
      const dtf = new Intl.DateTimeFormat([], {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const parts = dtf.formatToParts(now);
      const map = Object.fromEntries(
        parts.map(({ type, value }) => [type, value])
      );
      return {
        h: parseInt(map.hour ?? "0", 10),
        m: parseInt(map.minute ?? "0", 10),
        s: parseInt(map.second ?? "0", 10),
      };
    } catch {
      return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
    }
  }, [now, timeZone]);

  const hrAngle = (h % 12) * 30 + m * 0.5;
  const minAngle = m * 6 + s * 0.1;
  const secAngle = s * 6;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;

  const hours = Array.from({ length: 12 }, (_, i) => i);
  const ticks = Array.from({ length: 60 }, (_, i) => i);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Analog clock"
    >
      <defs>
        <radialGradient id="dial" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </radialGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={r + 8}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="2"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#dial)"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />

      <g transform={`translate(${cx} ${cy})`}>
        {ticks.map((i) => {
          const a = (i * 6 * Math.PI) / 180;
          const outer = r - 8;
          const inner = i % 5 === 0 ? outer - 14 : outer - 8;
          const x1 = Math.sin(a) * inner;
          const y1 = -Math.cos(a) * inner;
          const x2 = Math.sin(a) * outer;
          const y2 = -Math.cos(a) * outer;
          return (
            <line
              key={`t${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}
      </g>

      <g
        transform={`translate(${cx} ${cy})`}
        fontFamily="ui-sans-serif, system-ui"
        fontSize={size * 0.065}
        fill="rgba(255,255,255,0.9)"
      >
        {hours.map((i) => {
          const n = i === 0 ? 12 : i;
          const a = (i * 30 * Math.PI) / 180;
          const dist = r - 46;
          const x = Math.sin(a) * dist;
          const y = -Math.cos(a) * dist + 6;
          return (
            <text
              key={`n${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {n}
            </text>
          );
        })}
      </g>

      <g transform={`translate(${cx} ${cy})`} strokeLinecap="round">
        <g transform={`rotate(${hrAngle})`}>
          <line
            x1="0"
            y1="10"
            x2="0"
            y2={-r + 84}
            stroke="white"
            strokeOpacity="0.95"
            strokeWidth="6"
          />
        </g>
        <g transform={`rotate(${minAngle})`}>
          <line
            x1="0"
            y1="14"
            x2="0"
            y2={-r + 44}
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="4"
          />
        </g>
        <g transform={`rotate(${secAngle})`}>
          <line
            x1="0"
            y1="18"
            x2="0"
            y2={-r + 22}
            stroke="#60a5fa"
            strokeWidth="2"
          />
        </g>
        <circle r="7" fill="#60a5fa" />
        <circle r="3" fill="white" />
      </g>
    </svg>
  );
}

export default function AttendanceKiosk() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();

  const companyId = useMemo(() => {
    const c = currentUser?.company;
    console.log("Current user company:", c);
    if (!c) return null;
    return typeof c === "object" ? c._id || c.id || null : c;
  }, [currentUser]);

  const companyFromUser = useMemo(
    () =>
      typeof currentUser?.company === "object" ? currentUser.company : null,
    [currentUser]
  );

  const needCompanyFetch =
    !!companyId &&
    !(companyFromUser && (companyFromUser.timezone || companyFromUser.name));

  const companiesQ = useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000,
    enabled: needCompanyFetch,
  });

  const selectedCompany = useMemo(() => {
    if (companyFromUser) {
      return {
        _id: companyFromUser._id || companyFromUser.id,
        name:
          companyFromUser.name ||
          companyFromUser.companyName ||
          companyFromUser.title ||
          "—",
        timezone: companyFromUser.timezone,
      };
    }
    const list = companiesQ.data || [];
    return list.find((c) => c._id === companyId) || null;
  }, [companyFromUser, companiesQ.data, companyId]);

  // ---- UI state ----
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // Extend modes: "in" | "out" | "breakStart" | "breakEnd"
  const [pinModal, setPinModal] = useState({ open: false, mode: "in" });
  const [pin, setPin] = useState("");
  const [breakNote, setBreakNote] = useState(""); // optional note for Start Break
  const pinInputRef = useRef(null);
  // PIN setup flow (when user has no kiosk PIN)
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [pinSetup, setPinSetup] = useState("");
  const [pendingActionAfterPin, setPendingActionAfterPin] = useState(null); // 'in' | 'out' | 'breakStart' | 'breakEnd'

  // ---- Fullscreen ----
  const containerRef = useRef(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [fsSupported, setFsSupported] = useState(true);

  useEffect(() => {
    document.body.classList.add("kiosk-mode");
    const supported =
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled ||
      false;
    setFsSupported(!!supported);
    setNeedsGesture(supported ? !document.fullscreenElement : false);

    const onFsChange = () => setNeedsGesture(!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      document.body.classList.remove("kiosk-mode");
      document.removeEventListener("fullscreenchange", onFsChange);
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (document.fullscreenElement && exit)
        exit.call(document).catch(() => {});
    };
  }, []);

  const enterFullscreen = async () => {
    const el = containerRef.current || document.documentElement;
    const req =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!req) {
      setFsSupported(false);
      setNeedsGesture(false);
      return;
    }
    try {
      if (!document.fullscreenElement) await req.call(el);
      setNeedsGesture(false);
    } catch {
      setNeedsGesture(true);
    }
  };

  const handleAnyClick = () => {
    if (!document.fullscreenElement && fsSupported && !pinModal.open)
      enterFullscreen();
  };

  // Reset selection on company change
  useEffect(() => {
    setSelected(null);
    setSearch("");
  }, [companyId]);

  // ---- Clock (company timezone) ----
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tz = selectedCompany?.timezone || "UTC";
  const digital = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // Use 12-hour format with AM/PM
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(now);
    } catch {
      return now.toLocaleTimeString('en-US', { hour12: true });
    }
  }, [now, tz]);

  // ---- Data (no explicit paging UI; load a larger chunk) ----
  const pageSize = 5000;
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["kiosk-employees", { limit: pageSize, search, companyId }],
    queryFn: () =>
      fetchEmployeesForKiosk({ page: 1, limit: pageSize, search, companyId }),
    keepPreviousData: true,
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  });

  // const statusQ = useQuery({
  //   queryKey: ["kiosk-user-status", selected?._id],
  //   queryFn: () => listAttendance({ user: selected._id, page: 1, limit: 1 }),
  //   enabled: !!selected,
  //   staleTime: 30 * 1000,
  // });

  const statusQ = useQuery({
    queryKey: ["kiosk-user-status", selected?._id],
    queryFn: async () => {
      if (!selected?._id) {
        return { items: [] };
      }
      try {
        return await listAttendance({
          user: selected._id,
          page: 1,
          limit: 1,
        });
      } catch (error) {
        console.error("Status fetch error:", error);
        message.error("Failed to fetch attendance status");
        return { items: [] };
      }
    },
    enabled: !!selected?._id,
    staleTime: 30 * 1000,
    retry: 1,
    onError: (error) => {
      console.error("Status query error:", error);
      message.error("Failed to check attendance status");
    },
  });

  // Add error state handling
  const latest = statusQ.data?.items?.[0] || null;
  const hasError = statusQ.isError;

  // const latest = statusQ.data?.items?.[0] || null;
  const selCheckedIn = !!(latest && latest.checkOutAt == null);
  const selOnBreak = !!(latest && latest.checkOutAt == null && latest.onBreak); // <-- NEW
  const lastOpenBreak = useMemo(() => {
    const b = latest?.breaks || [];
    const lb = b[b.length - 1];
    return lb && !lb.endAt ? lb : null;
  }, [latest]);
  const selCheckInAtText = latest?.checkInAt
    ? formatAttendanceTime(latest.checkInAt, tz)
    : null;
  const selBreakStartAtText = lastOpenBreak?.startAt
    ? formatAttendanceTime(lastOpenBreak.startAt, tz)
    : null;

  // Company-specific attendance rules
  const rulesCompanyId = selected?.company?._id || companyId;
  const companyRules = useCompanyAttendanceRules(rulesCompanyId, latest);

  // Validate break before starting
  const handleStartBreak = async () => {
    if (!selected?.employeeId) return;
    
    try {
      // Show loading
      showLoading('Validating...', 'Checking break rules');
      
      // Validate with backend first
      const validation = await companyRules.validateBreakWithBackend(selected.employeeId);
      
      closeLoading();
      
      if (validation?.success && validation.canStartBreak) {
        // Show info toast about break rules
        const remainingBreakTime = companyRules.getRemainingBreakTime();
        if (remainingBreakTime !== null) {
          showInfoToast(`Break time remaining: ${remainingBreakTime} minutes`, "Break Info");
        }
        
        setPin("");
        setPinModal({ open: true, mode: "breakStart" });
        setTimeout(() => pinInputRef.current?.focus?.(), 0);
      } else {
        if (validation?.message?.includes('Break time limit reached')) {
          showWarningToast("Break time limit reached. Cannot start another break.", "Break Limit");
        } else {
          showErrorToast(validation?.message || "Cannot start break at this time");
        }
      }
    } catch (error) {
      closeLoading();
      console.error('Break validation error:', error);
      showWarningToast("Validation failed, proceeding with break");
      
      // Still allow break if validation fails
      setPin("");
      setPinModal({ open: true, mode: "breakStart" });
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    }
  };

  // Validate check-in before starting
  const handleCheckIn = async () => {
    if (!selected?.employeeId) return;
    
    try {
      // Show loading
      showLoading('Validating...', 'Checking company rules');
      
      // Validate with backend first
      const validation = await companyRules.validateAttendanceWithBackend('checkin', selected.employeeId);
      
      closeLoading();
      
      if (validation?.success !== false) {
        // Show info toast about company rules
        if (companyRules.isFixedShift) {
          showInfoToast(`Shift: ${companyRules.shiftHours}h work + ${companyRules.breakHours}h break`, "Company Rules");
        }
        
        setPin("");
        setPinModal({ open: true, mode: "in" });
        setTimeout(() => pinInputRef.current?.focus?.(), 0);
      } else {
        showErrorToast(validation?.message || "Cannot check in at this time");
      }
    } catch (error) {
      closeLoading();
      console.error('Check-in validation error:', error);
      showWarningToast("Validation failed, proceeding with check-in");
      
      // Still allow check-in if validation fails
      setPin("");
      setPinModal({ open: true, mode: "in" });
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    }
  };

  // Validate check-out before starting
  const handleCheckOut = async () => {
    if (!selected?.employeeId) return;
    
    try {
      // Show loading
      showLoading('Validating...', 'Checking work progress');
      
      // Validate with backend first
      const validation = await companyRules.validateAttendanceWithBackend('checkout', selected.employeeId);
      
      closeLoading();
      
      if (validation?.success !== false) {
        // Show work progress info for context (no force-checkout anymore)
        const workProgress = companyRules.getWorkProgress();
        if (workProgress.progress > 0) {
          showInfoToast(`Work progress: ${Math.round(workProgress.progress)}% (${workProgress.remainingMinutes} min remaining)`, "Work Progress");
        }
        
        setPin("");
        setPinModal({ open: true, mode: "out" });
        setTimeout(() => pinInputRef.current?.focus?.(), 0);
      } else {
        showErrorToast(validation?.message || "Cannot check out at this time");
      }
    } catch (error) {
      closeLoading();
      console.error('Check-out validation error:', error);
      showWarningToast("Validation failed, proceeding with check-out");
      
      // Still allow check-out if validation fails
      setPin("");
      setPinModal({ open: true, mode: "out" });
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    }
  };

  // Handle end break
  const handleEndBreak = async () => {
    if (!selected?._id) return;
    
    try {
      // Show info toast about ending break
      showInfoToast("Ending break - enter your PIN to confirm", "End Break");
      
      setPin("");
      setPinModal({ open: true, mode: "breakEnd" });
      setTimeout(() => pinInputRef.current?.focus?.(), 0);
    } catch (error) {
      console.error('End break error:', error);
      showErrorToast("Failed to end break");
    }
  };

  // ---- Mutations ----
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["kiosk-employees"] });
    if (selected?._id)
      qc.invalidateQueries({ queryKey: ["kiosk-user-status", selected._id] });
  };

  const handleNoPinError = (mode) => {
    setPendingActionAfterPin(mode);
    setPinSetup("");
    setPinSetupOpen(true);
  };

  const savePinSetup = async () => {
    if (!selected?._id) return;
    if (!/^\d{4,6}$/.test(pinSetup)) {
      message.error("PIN must be 4–6 digits");
      return;
    }
    try {
      await setEmployeeKioskPin(selected._id, String(pinSetup));
      showSuccessToast("PIN set successfully", "Kiosk PIN");
      setPinSetupOpen(false);
      // Retry the pending action with the provided PIN
      const userId = selected._id;
      const p = String(pinSetup);
      if (!userId) return;
      if (pendingActionAfterPin === "in") {
        checkInMut.mutate({ employeeId: userId, note: "", pin: p });
      } else if (pendingActionAfterPin === "out") {
        checkOutMut.mutate({ employeeId: userId, pin: p });
      } else if (pendingActionAfterPin === "breakStart") {
        startBreakMut.mutate({ employeeId: userId, note: breakNote || "", pin: p });
      } else if (pendingActionAfterPin === "breakEnd") {
        endBreakMut.mutate({ employeeId: userId, pin: p });
      }
      setPendingActionAfterPin(null);
    } catch (e) {
      showErrorToast(e?.response?.data?.message || "Failed to set PIN", "Kiosk PIN");
    }
  };

  const checkInMut = useMutation({
    mutationFn: ({ employeeId, note, pin }) =>
      kioskCheckIn({ employeeId, note, pin }),
    onSuccess: () => {
      showSuccessToast("Successfully checked in", "Check In Complete");
      invalidateAll();
      setPin("");
      setPinModal({ open: false, mode: "in" });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || "Check-in failed";
      const status = e?.response?.status;
      if (status === 400) {
        // Backend: open session from previous day — require checkout first
        showWarningToast(msg, "Previous Session Found");
        // Switch modal to checkout; preserve PIN so user can proceed
        setPinModal((prev) => ({ ...prev, mode: "out" }));
        return;
      }
      if (msg?.toLowerCase?.().includes("no pin set")) {
        handleNoPinError("in");
        return;
      }
      showErrorToast(msg, "Check In Failed");
      setPin("");
    },
  });

  const checkOutMut = useMutation({
    mutationFn: ({ employeeId, pin }) => kioskCheckOut({ employeeId, pin }),
    onSuccess: () => {
      showSuccessToast("Successfully checked out", "Check Out Complete");
      invalidateAll();
      setPin("");
      setPinModal({ open: false, mode: "out" });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || "Check-out failed";
      if (msg?.toLowerCase?.().includes("no pin set")) {
        handleNoPinError("out");
        return;
      }
      showErrorToast(msg, "Check Out Failed");
      setPin("");
    },
  });

  // NEW: Break mutations
  const startBreakMut = useMutation({
    mutationFn: ({ employeeId, note, pin }) =>
      kioskStartBreak({ employeeId, note, pin }),
    onSuccess: () => {
      showSuccessToast("Break started successfully", "Break Started");
      invalidateAll();
      setPin("");
      setBreakNote("");
      setPinModal({ open: false, mode: "breakStart" });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || "Failed to start break";
      if (msg?.toLowerCase?.().includes("no pin set")) {
        handleNoPinError("breakStart");
        return;
      }
      showErrorToast(msg, "Break Start Failed");
      setPin("");
    },
  });

  const endBreakMut = useMutation({
    mutationFn: ({ employeeId, pin }) => kioskEndBreak({ employeeId, pin }),
    onSuccess: () => {
      showSuccessToast("Break ended successfully", "Break Ended");
      invalidateAll();
      setPin("");
      setPinModal({ open: false, mode: "breakEnd" });
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || "Failed to end break";
      if (msg?.toLowerCase?.().includes("no pin set")) {
        handleNoPinError("breakEnd");
        return;
      }
      showErrorToast(msg, "Break End Failed");
      setPin("");
    },
  });

  const users = data?.users ?? [];

  // ---- PIN helpers ----
  const submitPin = () => {
    if (!selected) return;
    if (!/^\d{4,6}$/.test(pin)) {
      message.error("PIN must be 4–6 digits");
      return;
    }
    // Actions use userId; validations already used employeeId
    const employeeId = selected._id;
    const p = String(pin);

    if (!employeeId) return;

    if (pinModal.mode === "in") {
      checkInMut.mutate({ employeeId, note: "", pin: p });
    } else if (pinModal.mode === "out") {
      checkOutMut.mutate({ employeeId, pin: p });
    } else if (pinModal.mode === "breakStart") {
      startBreakMut.mutate({ employeeId, note: breakNote || "", pin: p });
    } else if (pinModal.mode === "breakEnd") {
      endBreakMut.mutate({ employeeId, pin: p });
    }
  };

  const appendDigit = (d) => setPin((p) => (p + d).slice(0, 6));
  const backspace = () => setPin((p) => p.slice(0, -1));
  const clearPin = () => setPin("");

  // Clock auto-fit to column
  const clockColRef = useRef(null);
  const [clockSize, setClockSize] = useState(280);
  useEffect(() => {
    const compute = () => {
      const area = clockColRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const padding = 24;
      const max = Math.min(rect.width, rect.height) - padding;
      const fitted = Math.max(140, Math.min(560, Math.floor(max)));
      setClockSize(fitted);
    };
    compute();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(compute);
      ro.observe(clockColRef.current);
    } else {
      window.addEventListener("resize", compute);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", compute);
    };
  }, []);

  const modalTitles = {
    in: "Enter PIN to Check In",
    out: "Enter PIN to Check Out",
    breakStart: "Enter PIN to Start Break",
    breakEnd: "Enter PIN to End Break",
  };
  const modalOkText = {
    in: "Check In",
    out: "Check Out",
    breakStart: "Start Break",
    breakEnd: "End Break",
  };

  return (
    <div
      ref={containerRef}
      data-kiosk-container
      onClick={handleAnyClick}
      className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white flex flex-col"
      style={{ position: "relative" }}
    >
      {/* Header */}
      <header className="px-4 sm:px-8 py-3 shrink-0 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight">
              Attendance Kiosk
            </div>
            <div className="text-white/60 text-sm">
              Check-ins, breaks, and check-outs with PIN
            </div>
          </div>
          {selectedCompany && (
            <div className="flex items-center gap-2 text-white/80">
              <span className="font-medium truncate max-w-[40vw] sm:max-w-none">
                {selectedCompany?.name}
              </span>
              {selectedCompany?.timezone && (
                <Tag color="geekblue">{selectedCompany.timezone}</Tag>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main — exact 50/50 rows */}
      <main className="flex-1 min-h-0 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto h-full grid grid-rows-2 gap-4 min-h-0 overflow-y-auto">
          {/* ===== Top 50% — Employee Selection ===== */}
          <section className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-lg flex flex-col min-h-0 overflow-y-auto">
            <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <Input.Search
                allowClear
                size="large"
                placeholder="Search employees by name or email…"
                onSearch={(v) => {
                  setSearch(v || "");
                }}
                onChange={(e) => {
                  if (!e.target.value) setSearch("");
                }}
                className="bg-white/90 text-black !rounded-lg !h-11 w-full sm:max-w-xl"
                disabled={!companyId}
              />
              <div className="text-white/50 text-sm">
                {isFetching ? "Refreshing…" : ""}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {!companyId ? (
                <div className="w-full h-full grid place-items-center text-white/70 text-center px-6">
                  This kiosk user is not associated with a company. Please
                  contact an admin.
                </div>
              ) : isLoading ? (
                <div className="w-full h-full grid place-items-center">
                  <Spin size="large" />
                </div>
              ) : users.length === 0 ? (
                <div className="w-full h-full grid place-items-center text-white/70 text-center px-6">
                  No employees found.
                </div>
              ) : (
                <div className="h-full overflow-auto p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                    {users.map((u) => {
                      const initials = `${(u.firstName || "")[0] || ""}${
                        (u.lastName || "")[0] || ""
                      }`.toUpperCase();
                      const isSel = selected?._id === u._id;
                      return (
                        <button
                          key={u._id}
                          onClick={() => setSelected(isSel ? null : u)}
                          className={`group rounded-xl text-left border transition focus:outline-none focus:ring-2 focus:ring-indigo-400/60
                                      ${
                                        isSel
                                          ? "border-indigo-400 bg-white/10 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
                                      }`}
                          style={{ minHeight: 88 }}
                        >
                          <div className="p-3 sm:p-4 flex items-center gap-3">
                            <div
                              className={`h-11 w-11 rounded-lg grid place-items-center text-base font-semibold 
                                            bg-gradient-to-br from-indigo-400/30 to-indigo-500/10
                                            ${
                                              isSel
                                                ? "ring-2 ring-indigo-400/60"
                                                : "ring-0"
                                            }`}
                            >
                              {initials || "?"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {u.firstName} {u.lastName}
                              </div>
                              <div className="text-white/60 text-sm truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ===== Bottom 50% — Two columns: Clock | Info ===== */}
          <section className="grid grid-cols-1 md:grid-cols-2 rounded-xl h-full border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-lg overflow-y-auto">
            {/* LEFT: Clock */}
            <div
              ref={clockColRef}
              className="min-h-0 h-full w-full flex items-center justify-center overflow-hidden px-4 py-4"
            >
              <AnalogClock now={now} timeZone={tz} size={clockSize} />
            </div>
            {/* RIGHT: Info panel */}
            <div className="min-h-0 h-full w-full border-t md:border-t-0 md:border-l border-white/10 px-5 sm:px-6 py-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-semibold tracking-tight truncate">
                    {selectedCompany?.name || "—"}
                  </div>
                  <div className="text-white/60 text-sm truncate">
                    {selectedCompany?.timezone ? `Current time: ${new Intl.DateTimeFormat('en-US', {
                      timeZone: selectedCompany.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    }).format(now)} (${selectedCompany.timezone})` : "Timezone not set"}
                  </div>
                </div>
                <Tag color="geekblue" className="shrink-0">
                  {tz}
                </Tag>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-md shadow-black/20">
                <div className="text-3xl sm:text-4xl font-semibold tabular-nums leading-none">
                  {new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                  }).format(now)}
                </div>
                <div className="text-white/60 text-xs sm:text-sm mt-1">
                  {new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  }).format(now)}
                </div>
                <div className="text-white/60 text-xs sm:text-sm mt-1">
                  Current company time
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-md shadow-black/20">
                <div className="text-sm text-white/60 mb-3">
                  Selected employee
                </div>

                {selected ? (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                      <div className="sm:col-span-1">
                        <div className="text-white/60 text-xs">Name</div>
                        <div className="font-medium truncate">
                          {selected.firstName} {selected.lastName}
                        </div>
                      </div>
                      <div className="sm:col-span-1">
                        <div className="text-white/60 text-xs">Email</div>
                        <div className="">{selected.email}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Status</div>
                      <div className="mt-0.5">
                        {statusQ.isFetching ? (
                          <Tag>Checking…</Tag>
                        ) : statusQ.isError ? (
                          <Tag color="red">Error checking status</Tag>
                        ) : selCheckedIn ? (
                          selOnBreak ? (
                            <Tag color="gold">
                              On break
                              {selBreakStartAtText
                                ? ` • ${selBreakStartAtText}`
                                : ""}
                            </Tag>
                          ) : (
                            <Tag color="green">
                              Checked in
                              {selCheckInAtText ? ` • ${selCheckInAtText}` : ""}
                            </Tag>
                          )
                        ) : (
                          <Tag>Not checked in</Tag>
                        )}
                      </div>
                    </div>

                    {/* Company-specific rules display */}
                    {companyRules.isLoading && (
                      <div className="mt-3 p-2 bg-gray-500/10 border border-gray-500/20 rounded">
                        <div className="text-gray-300 text-xs">Loading company rules...</div>
                      </div>
                    )}
                    
                    {companyRules.error && (
                      <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <div className="text-red-300 text-xs">Failed to load company rules. Using default settings.</div>
                      </div>
                    )}
                    
                    {companyRules.isFixedShift && !companyRules.isLoading && (
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                        <div className="text-blue-300 text-xs font-medium mb-1">
                          {companyRules.uiMessages.shiftInfo}
                        </div>
                        <div className="text-blue-200/80 text-xs">
                          {companyRules.uiMessages.breakInfo}
                        </div>
                        
                        {/* Work progress bar */}
                     {selCheckedIn && !selOnBreak && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-blue-200/80 mb-1">
                              <span>Work Progress</span>
                              <span>{Math.round(companyRules.getWorkProgress().progress)}%</span>
                            </div>
                            <div className="w-full bg-blue-900/30 rounded-full h-1.5">
                              <div 
                                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, companyRules.getWorkProgress().progress)}%` }}
                              />
                            </div>
                            <div className="text-xs text-blue-200/60 mt-1">
                              {companyRules.getWorkProgress().remainingMinutes > 0 
                                ? `${companyRules.getWorkProgress().remainingMinutes} minutes remaining`
                                : 'Shift complete'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Warnings */}
                    {companyRules.warnings.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {companyRules.warnings.map((warning, index) => (
                          <div 
                            key={index}
                            className={`text-xs p-2 rounded ${
                              warning.type === 'error' 
                                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {warning.message}
                          </div>
                        ))}
                      </div>
                    )}

                     {/* Optional break note input (only when starting a break) */}
                     {selCheckedIn && !selOnBreak && companyRules.canStartBreak && (
                      <div className="sm:col-span-3 mt-2">
                        <div className="text-white/60 text-xs mb-1">
                          Break note (optional)
                        </div>
                        <Input
                          value={breakNote}
                          onChange={(e) => setBreakNote(e.target.value)}
                          placeholder="e.g., Lunch, appointment, etc."
                        />
                      </div>
                    )}

                    {/* Break time remaining */}
                    {selCheckedIn && companyRules.getRemainingBreakTime() !== null && (
                      <div className="mt-2 text-xs text-white/60">
                        Break time remaining: {companyRules.getRemainingBreakTime()} minutes
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-white/60">No employee selected</div>
                )}
              </div>

              <div className="flex-1" />
              <div className="text-xs text-white/50">
                {isFetching ? "Refreshing employee list…" : "Ready"}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-black/40 backdrop-blur border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="text-white/85 truncate">
            {selected ? (
              <>
                <span className="font-semibold">
                  {selected.firstName} {selected.lastName}
                </span>
                <span className="text-white/60"> • {selected.email}</span>
                {statusQ.isFetching ? (
                  <span className="ml-2 text-white/60">• checking status…</span>
                ) : selCheckedIn ? (
                  selOnBreak ? (
                    <span className="ml-2 text-yellow-300">
                      • On break
                      {selBreakStartAtText
                        ? ` since ${selBreakStartAtText}`
                        : ""}
                    </span>
                  ) : (
                    <span className="ml-2 text-emerald-300">
                      • Checked in
                      {selCheckInAtText ? ` at ${selCheckInAtText}` : ""}
                    </span>
                  )
                ) : null}
              </>
            ) : (
              <span className="text-white/60">Select an employee</span>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3">
            {/* Check In */}
            <Tooltip
              title={
                !selected
                  ? "Select an employee"
                  : selCheckedIn
                  ? "Already checked in"
                  : ""
              }
            >
              <button
                disabled={!selected || selCheckedIn || checkInMut.isPending}
                loading={checkInMut.isPending}
                onClick={handleCheckIn}
                className="!rounded-lg !h-11 !px-5 whitespace-nowrap bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check In
              </button>
            </Tooltip>

            {/* Start Break */}
            {selCheckedIn && !selOnBreak && (
              <Tooltip title={
                !selected 
                  ? "Select an employee" 
                  : !companyRules.canStartBreak 
                    ? (companyRules.breakValidation?.reason || "Break time limit reached")
                    : ""
              }>
                <button
                  disabled={!selected || !companyRules.canStartBreak || startBreakMut.isPending || companyRules.isBreakValidationLoading}
                  loading={startBreakMut.isPending || companyRules.isBreakValidationLoading}
                  onClick={handleStartBreak}
                  className="!rounded-lg !h-11 !px-5 w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Break
                </button>
              </Tooltip>
            )}

            {/* End Break */}
            {selCheckedIn && selOnBreak && (
              <Tooltip title={!selected ? "Select an employee" : ""}>
                <Button
                  size="large"
                  disabled={!selected || endBreakMut.isPending}
                  loading={endBreakMut.isPending}
                  onClick={handleEndBreak}
                  className="!rounded-lg !h-11 !px-5"
                >
                  End Break
                </Button>
              </Tooltip>
            )}

            {/* Check Out (works for both regular and force checkout scenarios) */}
            {selCheckedIn && (
              <Tooltip
                title={
                  !selected
                    ? "Select an employee"
                    : selOnBreak
                    ? "On a break — will auto end then check out"
                    : ""
                }
              >
                <Button
                  size="large"
                  disabled={!selected || checkOutMut.isPending}
                  loading={checkOutMut.isPending}
                  onClick={handleCheckOut}
                  danger
                  className="!rounded-lg !h-11 !px-5"
                >
                  Check Out
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </footer>

      {/* Fullscreen overlay */}
      {fsSupported && needsGesture && !pinModal.open && (
        <button
          onClick={enterFullscreen}
          className="fixed inset-0 flex items-center justify-center bg-slate-950/70 text-white text-lg"
        >
          Tap to enter fullscreen
        </button>
      )}

      {/* PIN Modal (now supports all four actions) */}
      <Modal
        title={modalTitles[pinModal.mode]}
        open={pinModal.open}
        onCancel={() => {
          setPinModal({ open: false, mode: "in" });
          setPin("");
        }}
        onOk={submitPin}
        okText={modalOkText[pinModal.mode]}
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        getContainer={() => containerRef.current || document.body}
        okButtonProps={{
          loading:
            checkInMut.isPending ||
            checkOutMut.isPending ||
            startBreakMut.isPending ||
            endBreakMut.isPending,
        }}
      >
        {/* Only show note field when starting a break */}
        {pinModal.mode === "breakStart" && (
          <Input.TextArea
            rows={2}
            placeholder="Break note (optional)"
            value={breakNote}
            onChange={(e) => setBreakNote(e.target.value)}
            className="mb-3"
          />
        )}

        <Input
          ref={pinInputRef}
          placeholder="4–6 digit PIN"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D+/g, "").slice(0, 6))
          }
          onPressEnter={submitPin}
          size="large"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
        />

        <div className="grid grid-cols-3 gap-2 mt-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Button key={d} onClick={() => appendDigit(d)}>
              {d}
            </Button>
          ))}
          <Button onClick={clearPin}>Clear</Button>
          <Button onClick={() => appendDigit("0")}>0</Button>
          <Button onClick={backspace}>⌫</Button>
        </div>
      </Modal>

      {/* PIN Setup Modal (when no PIN set) */}
      <Modal
        title="Set Kiosk PIN"
        open={pinSetupOpen}
        onCancel={() => setPinSetupOpen(false)}
        onOk={savePinSetup}
        okText="Save PIN"
        maskClosable={false}
        keyboard={false}
        destroyOnClose
        getContainer={() => containerRef.current || document.body}
      >
        <div className="text-white/80 mb-2">Set a 4–6 digit PIN for {selected?.firstName} {selected?.lastName}</div>
        <Input
          placeholder="4–6 digit PIN"
          value={pinSetup}
          onChange={(e) => setPinSetup(e.target.value.replace(/\D+/g, "").slice(0, 6))}
          size="large"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </Modal>
    </div>
  );
}
