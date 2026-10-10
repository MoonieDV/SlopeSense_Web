import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  confirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  CloudRain,
  Droplet,
  Eye,
  FileText,
  Home as HomeIcon,
  Hourglass,
  Info,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Megaphone,
  Mountain,
  MoreVertical,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  TriangleAlert,
  Waves,
  Wind,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { onValue, push, ref as dbRef, set } from "firebase/database";
import { SectionPulseIcon } from "@/components/DashboardIcons";
import { firebaseAuth, firebaseDatabase } from "@/lib/firebase";

const dashboardIcons = {
  warning: "/dashboard-icons/Warning.png",
  alerts: "/dashboard-icons/Active Alert.png",
  sensor: "/dashboard-icons/sensor status.png",
  reports: "/dashboard-icons/reports.png",
  soil: "/dashboard-icons/soilmoisture.png",
  rain: "/dashboard-icons/rain.png",
  stable: "/dashboard-icons/stable.png",
  vibration: "/dashboard-icons/vibration.png",
  alertCritical: "/dashboard-icons/alert-critical.png",
  alertWarning: "/dashboard-icons/alert-warning.png",
  alertInfo: "/dashboard-icons/alert-info.png",
  alertResolved: "/dashboard-icons/alert-resolved.png",
};

const getDetectionState = (sensor = {}, candidateFields = []) => {
  for (const field of candidateFields) {
    const raw = sensor[field];
    if (raw === undefined || raw === null || raw === "") continue;

    if (typeof raw === "boolean") return raw;

    const normalized = String(raw).trim().toLowerCase();
    if (["1", "true", "yes", "detected", "active", "warning", "tilt detected", "vibration detected"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "normal", "stable", "clear"].includes(normalized)) {
      return false;
    }

    const numericValue = Number(raw);
    if (!Number.isNaN(numericValue)) {
      return numericValue > 0;
    }
  }

  return false;
};

const isSensorOffline = (sensor = {}) => {
  if (!sensor || Object.keys(sensor).length === 0) return true;

  const updatedAt = Number(sensor.receivedAt ?? sensor.updatedAt ?? sensor.timestamp ?? 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return true;
  }

  return Date.now() - updatedAt > 10 * 60 * 1000;
};

const buildSensorData = (liveSensors = {}) => {
  const soil = liveSensors.soil ?? {};
  const rain = liveSensors.rain ?? {};
  const tilt = liveSensors.tilt ?? {};
  const vibration = liveSensors.vibration ?? {};
  const soilMoisture = Number(soil.moisturePercent ?? 33);
  const rainADC = Number(rain.rawValue ?? 0);
  const soilWarning = soilMoisture >= 70;
  const rainWarning = Number(rainADC) > 0 || String(rain.level ?? "").toLowerCase() !== "dry";
  const tiltDetected = getDetectionState(tilt, ["tiltDetected", "detected", "level", "value", "status"]);
  const vibrationDetected = getDetectionState(vibration, ["vibrationDetected", "detected", "level", "value", "status"]);
  const soilOffline = isSensorOffline(soil);
  const rainOffline = isSensorOffline(rain);
  const tiltOffline = isSensorOffline(tilt);
  const vibrationOffline = isSensorOffline(vibration);

  return [
    {
      id: "soil",
      name: "Soil Moisture",
      code: "Capacitive sensor",
      value: soilOffline ? "—" : `${soilMoisture}%`,
      detail: soilOffline ? "Reading unavailable" : soilWarning ? "High moisture level" : "Current moisture level",
      state: soilOffline ? "OFFLINE" : soilWarning ? "WARNING" : "NORMAL",
      tone: soilOffline ? "neutral" : "green",
      trend: soilOffline ? "No data" : soilWarning ? "Increasing" : "Stable",
      icon: Droplet,
    },
    {
      id: "rain",
      name: "Rain Sensor",
      code: "",
      value: rainOffline ? "—" : rainWarning ? "Rain detected" : "No rain",
      reading: rainOffline ? "--" : `${rainADC}`,
      detail: rainOffline ? "Reading unavailable" : "Raw sensor reading (ADC)",
      state: rainOffline ? "OFFLINE" : rainWarning ? "WARNING" : "NORMAL",
      tone: rainOffline ? "neutral" : "green",
      icon: CloudRain,
    },
    {
      id: "tilt",
      name: "Tilt Sensor",
      code: "",
      value: tiltOffline ? "—" : tiltDetected ? "Tilt detected" : "Stable",
      detail: tiltOffline ? "Reading unavailable" : tiltDetected ? "Movement requires attention" : "No tilt detected",
      state: tiltOffline ? "OFFLINE" : tiltDetected ? "WARNING" : "NORMAL",
      tone: tiltOffline ? "neutral" : "green",
      icon: TriangleAlert,
    },
    {
      id: "vibration",
      name: "Vibration Sensor",
      code: "",
      value: vibrationOffline ? "—" : vibrationDetected ? "Vibration detected" : "No vibration",
      detail: vibrationOffline ? "Reading unavailable" : vibrationDetected ? "Movement requires attention" : "No vibration detected",
      state: vibrationOffline ? "OFFLINE" : vibrationDetected ? "WARNING" : "NORMAL",
      tone: vibrationOffline ? "neutral" : "green",
      icon: Activity,
    },
  ];
};

const buildMonitoringSensorData = (liveSensors = {}) => {
  const soil = liveSensors.soil ?? {};
  const rain = liveSensors.rain ?? {};
  const tilt = liveSensors.tilt ?? {};
  const vibration = liveSensors.vibration ?? {};
  const soilMoisture = Number(soil.moisturePercent ?? 33);
  const rainADC = Number(rain.rawValue ?? 0);
  const soilWarning = soilMoisture >= 70;
  const rainWarning = Number(rainADC) > 0 || String(rain.level ?? "").toLowerCase() !== "dry";
  const tiltDetected = getDetectionState(tilt, ["tiltDetected", "detected", "level", "value", "status"]);
  const vibrationDetected = getDetectionState(vibration, ["vibrationDetected", "detected", "level", "value", "status"]);
  const soilOffline = isSensorOffline(soil);
  const rainOffline = isSensorOffline(rain);
  const tiltOffline = isSensorOffline(tilt);
  const vibrationOffline = isSensorOffline(vibration);

  return [
    {
      id: "soil",
      name: "Soil Moisture",
      code: "Moisture reading",
      value: soilOffline ? "—" : `${soilMoisture}%`,
      detail: soilOffline ? "Reading unavailable" : soilWarning ? "High moisture level" : "Current moisture level",
      state: soilOffline ? "OFFLINE" : soilWarning ? "WARNING" : "NORMAL",
      tone: soilOffline ? "neutral" : "green",
      updated: soilOffline ? "Unavailable" : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
    },
    {
      id: "rain",
      name: "Rain Sensor",
      code: "Raw ADC reading",
      value: rainOffline ? "—" : rainWarning ? `${rainADC}` : "0",
      detail: rainOffline ? "Reading unavailable" : rainWarning ? "Rain detected (ADC)" : "Dry / no rain",
      state: rainOffline ? "OFFLINE" : rainWarning ? "WARNING" : "NORMAL",
      tone: rainOffline ? "neutral" : "green",
      updated: rainOffline ? "Unavailable" : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
    },
    {
      id: "tilt",
      name: "Tilt Sensor",
      code: "Movement detection",
      value: tiltOffline ? "—" : tiltDetected ? "Tilt detected" : "Stable",
      detail: tiltOffline ? "Reading unavailable" : tiltDetected ? "Movement requires attention" : "No tilt detected",
      state: tiltOffline ? "OFFLINE" : tiltDetected ? "WARNING" : "NORMAL",
      tone: tiltOffline ? "neutral" : "green",
      updated: tiltOffline ? "Unavailable" : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
    },
    {
      id: "vibration",
      name: "Vibration Sensor",
      code: "Movement detection",
      value: vibrationOffline ? "—" : vibrationDetected ? "Vibration detected" : "No vibration",
      detail: vibrationOffline ? "Reading unavailable" : vibrationDetected ? "Movement requires attention" : "No vibration detected",
      state: vibrationOffline ? "OFFLINE" : vibrationDetected ? "WARNING" : "NORMAL",
      tone: vibrationOffline ? "neutral" : "green",
      updated: vibrationOffline ? "Unavailable" : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }),
    },
  ];
};

const buildRecentReadings = (liveSensors = {}) => {
  const soil = liveSensors.soil ?? {};
  const rain = liveSensors.rain ?? {};
  const tilt = liveSensors.tilt ?? {};
  const vibration = liveSensors.vibration ?? {};
  const soilMoisture = Number(soil.moisturePercent ?? 0);
  const rainADC = Number(rain.rawValue ?? 0);
  const rainWarning = Number(rainADC) > 0 || String(rain.level ?? "").toLowerCase() !== "dry";
  const soilWarning = soilMoisture >= 70;
  const tiltDetected = getDetectionState(tilt, ["tiltDetected", "detected", "value", "level", "status"]);
  const vibrationDetected = getDetectionState(vibration, ["vibrationDetected", "detected", "value", "level", "status"]);
  const formatObservedTime = (sensor) => sensor.receivedAt
    ? new Date(sensor.receivedAt).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })
    : "Unavailable";

  return [
    {
      time: formatObservedTime(soil),
      sensor: "Soil Moisture",
      reading: isSensorOffline(soil) ? "—" : `${soilMoisture}%`,
      status: isSensorOffline(soil) ? "Reading unavailable" : soilWarning ? "Above threshold" : "Within threshold",
      condition: isSensorOffline(soil) ? "OFFLINE" : soilWarning ? "WARNING" : "NORMAL",
    },
    {
      time: formatObservedTime(rain),
      sensor: "Rain Sensor",
      reading: isSensorOffline(rain) ? "—" : `${rainADC} (ADC)`,
      status: isSensorOffline(rain) ? "Reading unavailable" : rainWarning ? "Rain detected" : "No rainfall",
      condition: isSensorOffline(rain) ? "OFFLINE" : rainWarning ? "WARNING" : "NORMAL",
    },
    {
      time: formatObservedTime(tilt),
      sensor: "Tilt Sensor",
      reading: isSensorOffline(tilt) ? "—" : tiltDetected ? "1 (Detected)" : "0 (Stable)",
      status: isSensorOffline(tilt) ? "Reading unavailable" : tiltDetected ? "Tilt detected" : "No tilt detected",
      condition: isSensorOffline(tilt) ? "OFFLINE" : tiltDetected ? "WARNING" : "NORMAL",
    },
    {
      time: formatObservedTime(vibration),
      sensor: "Vibration Sensor",
      reading: isSensorOffline(vibration) ? "—" : vibrationDetected ? "1 (Detected)" : "0 (No vibration)",
      status: isSensorOffline(vibration) ? "Reading unavailable" : vibrationDetected ? "Vibration detected" : "No vibration detected",
      condition: isSensorOffline(vibration) ? "OFFLINE" : vibrationDetected ? "WARNING" : "NORMAL",
    },
  ];
};

const pageMeta = {
  dashboard: ["Dashboard Overview", "Real-time overview of slope conditions and recent activities."],
  sensors: ["Sensor Monitoring", "Real-time monitoring of environmental conditions from slope monitoring sensors."],
  alerts: ["Alerts", "View important changes in monitored slope conditions."],
  incidents: ["Incident Reports", "View and manage all incident reports submitted by residents."],
  announcements: ["Safety Announcements", "Create, manage, and publish safety announcements to keep the community informed."],
  profile: ["Profile", "Manage your BDRRMC account and dashboard preferences."],
};

function Logo({ small = false, stacked = false }) {
  if (stacked) {
    return (
      <div className="flex flex-col items-center text-center">
        <img
          src="/SlopeSenseLogo.jpg"
          alt="SlopeSense logo"
          className="h-32 w-48 object-contain mix-blend-multiply sm:h-36 sm:w-52"
        />
        <div className="mt-3 text-4xl sm:text-5xl font-black tracking-tight text-[#006b37]">
          SlopeSense
        </div>
        <div className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-[#334155]">
          BDRRMC Dashboard
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center ${small ? "gap-2.5" : "gap-3"}`}>
      <img
        src="/SlopeSenseLogo.jpg"
        alt="SlopeSense logo"
        className={`${small ? "h-9 w-12" : "h-11 w-14"} shrink-0 object-contain mix-blend-multiply`}
      />
      <div className="leading-tight">
        <div className={`${small ? "text-base font-black text-[#006b37]" : "text-[1.1rem] font-extrabold uppercase text-[#09633b]"} tracking-tight`}>
          SlopeSense
        </div>
        <div className={`${small ? "text-[0.68rem] font-bold text-[#475569]" : "text-[0.48rem] font-bold text-[#1d2f28]"}`}>
          BDRRMC Dashboard
        </div>
      </div>
    </div>
  );
}

function ToneIcon({ type = "info", size = 17 }) {
  const styles = { amber: "bg-[#fff1d5] text-[#d99000]", blue: "bg-[#e2efff] text-[#2c78ca]", purple: "bg-[#f1e6ff] text-[#814bd1]", red: "bg-[#ffe4e8] text-[#df3d56]", green: "bg-[#e1f6e8] text-[#198b4f]", info: "bg-[#e4efff] text-[#2874cf]" };
  const Icon = type === "amber" ? AlertTriangle : type === "blue" ? CloudRain : type === "purple" ? TriangleAlert : type === "red" ? Activity : type === "green" ? Droplet : Info;
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${styles[type] || styles.info}`}><Icon size={size} strokeWidth={2} /></span>;
}

function MetricCard({ icon: Icon, customIcon, tone, label, value, sub, action, onAction }) {
  const toneStyles = {
    amber: "bg-[#f8f5e9] text-[#7a6a37]",
    blue: "bg-[#eaf7ee] text-[#276749]",
    purple: "bg-[#eaf7ee] text-[#276749]",
    red: "bg-[#fdeeed] text-[#e02424]",
    green: "bg-[#eaf7ee] text-[#0e7b42]",
    neutral: "bg-[#f1f5f9] text-[#64748b]",
  };
  const valueStyles = {
    amber: "text-[#27352f]",
    blue: "text-[#27352f]",
    purple: "text-[#27352f]",
    red: "text-[#e02424]",
    green: "text-[#27352f]",
    neutral: "text-[#475569]",
  };

  return (
    <div className="dashboard-card flex min-h-[176px] flex-col p-5">
      <div className="dashboard-eyebrow">{label}</div>
      <div className="mt-4 flex min-w-0 items-center gap-3">
        {customIcon ? (
          customIcon
        ) : Icon ? (
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${toneStyles[tone] || toneStyles.blue}`}>
            <Icon size={24} strokeWidth={2.2} />
          </span>
        ) : null}
        <div className="min-w-0">
          <div className={`whitespace-nowrap text-2xl font-extrabold leading-tight tracking-tight ${valueStyles[tone] || valueStyles.blue}`}>
            {value}
          </div>
          <p className="mt-1 max-w-[185px] text-xs leading-4 text-[#526057]">{sub}</p>
        </div>
      </div>
      {action && (
        <button onClick={onAction} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold text-[#087442] hover:text-[#005c2e] hover:underline">
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

function SensorCard({ sensor }) {
  let iconElement;
  if (sensor.id === "soil" || sensor.name.includes("Soil") || sensor.name.includes("SOIL")) {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.soil} alt="Soil Moisture" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "rain" || sensor.name.includes("Rain") || sensor.name.includes("RAIN")) {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.rain} alt="Rain" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "tilt" || sensor.name.includes("Tilt") || sensor.name.includes("TILT")) {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.stable} alt="Tilt" className="dashboard-sensor-icon h-5 w-5 object-contain" />
      </span>
    );
  } else {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.vibration} alt="Vibration" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  }

  const isRain = sensor.id === "rain" || sensor.name.includes("RAIN") || sensor.name.includes("Rain");

  return (
    <div className="dashboard-card flex min-h-[224px] flex-col p-5">
      <div className="flex items-center gap-3">
        {iconElement}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#26352e]">
            {sensor.name}
          </div>
          {sensor.code && <div className="mt-0.5 text-xs text-[#77847c]">{sensor.code}</div>}
        </div>
      </div>

      <div className="mt-5 min-h-[64px]">
        {isRain ? (
          <div>
            <div className={`text-lg font-extrabold leading-tight ${sensor.state === "OFFLINE" ? "text-[#64748b]" : "text-[#27352f]"}`}>
              {sensor.value}
            </div>
            <div className="mt-0.5 text-xs text-[#55645b]">{sensor.detail}</div>
            {sensor.state !== "OFFLINE" && <div className="mt-0.5 text-base font-bold text-[#27352f]">{sensor.reading}</div>}
          </div>
        ) : sensor.id === "soil" || sensor.name.includes("Soil") ? (
          <div>
            <div className={`text-2xl font-extrabold leading-tight ${sensor.state === "OFFLINE" ? "text-[#64748b]" : "text-[#27352f]"}`}>
              {sensor.value}
            </div>
            <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
          </div>
        ) : (
          <div>
            <div
              className={`text-lg font-extrabold leading-tight ${
                sensor.state === "OFFLINE"
                  ? "text-[#64748b]"
                  : "text-[#27352f]"
              }`}
            >
              {sensor.value}
            </div>
            <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
          </div>
        )}
      </div>

      <div className="mb-4 mt-3">
        <span
          className={`status-badge ${
            sensor.state === "OFFLINE"
              ? "bg-[#f1f5f9] text-[#475569] ring-1 ring-inset ring-[#cbd5e1]"
              : sensor.state === "WARNING"
              ? "bg-[#f8f5e9] text-[#554d35] ring-1 ring-inset ring-[#ded5b5]"
              : "bg-[#eaf7ee] text-[#15803d]"
          }`}
        >
          {sensor.state}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[#eef1ee] pt-3 text-xs text-[#718078]">
        {sensor.trend ? (
          <span className="flex items-center gap-1 font-semibold text-[#0e7b42]">
            <ArrowUp size={13} strokeWidth={2.5} /> {sensor.trend}
          </span>
        ) : (
          <span />
        )}
        <span className="font-medium text-[#718078]">{sensor.state === "OFFLINE" ? "Last update unavailable" : "10:42 AM"}</span>
      </div>
    </div>
  );
}

function TableHeader({ children }) { return <div className="grid grid-cols-[1.55fr_1.05fr_1.05fr_0.8fr_0.7fr] gap-3 border-b border-[#e5e9e6] px-4 py-3 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-[#7c8881]">{children}</div>; }

function SensorLegend() {
  const guides = [
    ["soil", "Soil Moisture", "Percentage of water content in soil.", "bg-[#eaf7ee]"],
    ["rain", "Rain Sensor", "Measures rainfall using a raw ADC reading.", "bg-[#eaf7ee]"],
    ["stable", "Tilt Sensor", "Detects changes in slope position.", "bg-[#eaf7ee]"],
    ["vibration", "Vibration Sensor", "Detects ground vibration events.", "bg-[#eaf7ee]"],
  ];

  return (
    <section className="dashboard-card p-5 sm:p-6">
      <h2 className="dashboard-section-title">
        Sensor Guide
      </h2>
      <div className="mt-5 space-y-4">
        {guides.map(([iconKey, name, detail, bgClass]) => (
          <div key={name} className="flex items-center gap-3.5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${bgClass}`}>
              <img src={dashboardIcons[iconKey]} alt={name} className="dashboard-sensor-icon h-6 w-6 object-contain" />
            </span>
            <div className="text-xs leading-5">
              <span className="font-bold text-[#1e293b]">{name}:</span>{" "}
              <span className="text-[#64748b]">{detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonitoringSensorCard({ sensor }) {
  let iconElement;
  if (sensor.id === "soil") {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.soil} alt="Soil Moisture" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "rain") {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.rain} alt="Rain" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "tilt") {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.stable} alt="Tilt" className="dashboard-sensor-icon h-5 w-5 object-contain" />
      </span>
    );
  } else {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
        <img src={dashboardIcons.vibration} alt="Vibration" className="dashboard-sensor-icon h-6 w-6 object-contain" />
      </span>
    );
  }

  return (
    <div className="dashboard-card flex min-h-[220px] flex-col p-5">
      <div className="flex items-center gap-3">
        {iconElement}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#26352e]">
            {sensor.name}
          </div>
          <div className="mt-0.5 text-xs text-[#77847c]">{sensor.code}</div>
        </div>
      </div>

      <div className="mt-5 min-h-[62px]">
        <div
          className={`text-2xl font-extrabold leading-tight ${
            sensor.state === "OFFLINE"
              ? "text-[#64748b]"
              : "text-[#27352f]"
          }`}
        >
          {sensor.value}
        </div>
        <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
      </div>

      <div className="mb-4 mt-3">
        <span
          className={`status-badge ${
            sensor.state === "OFFLINE"
              ? "bg-[#f1f5f9] text-[#475569] ring-1 ring-inset ring-[#cbd5e1]"
              : sensor.state === "WARNING"
              ? "bg-[#f8f5e9] text-[#554d35] ring-1 ring-inset ring-[#ded5b5]"
              : "bg-[#eaf7ee] text-[#15803d]"
          }`}
        >
          {sensor.state}
        </span>
      </div>

      <div className="mt-auto flex items-center gap-1.5 border-t border-[#eef1ee] pt-3 text-xs text-[#718078]">
        <Clock size={13} className="shrink-0 text-[#718078]" />
        <span>Updated: {sensor.updated}</span>
      </div>
    </div>
  );
}


function DashboardOverview({ setPage, sensorData, activeAlertCount = 0, liveAlerts = [], incidentReports = [] }) {
  const alertLevel = activeAlertCount > 0 ? "WARNING" : "NORMAL";
  const onlineSensorCount = sensorData.filter((sensor) => sensor.state !== "OFFLINE").length;
  const recentAlertRows = liveAlerts.slice(0, 3).map((alert) => [
    alert.title,
    alert.description,
    alert.time,
    alert.id === "ALT-TILT" || alert.id === "ALT-VIBRATION" ? "DANGER" : alert.status === "Resolved" ? "NORMAL" : "WARNING",
    alert.id === "ALT-TILT" || alert.id === "ALT-VIBRATION" ? "red" : "green",
  ]);
  const recentIncidentRows = incidentReports.slice(0, 3).map((report) => [
    report.title,
    report.location,
    report.timestamp > 0
      ? new Date(report.timestamp).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : "Time unavailable",
    String(report.status).toUpperCase(),
    report.status === "Resolved" ? "green" : "amber",
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard
          customIcon={
            alertLevel === "WARNING" ? (
              <img src={dashboardIcons.warning} alt="Warning status" className="h-12 w-12 shrink-0 object-contain" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf7ee] text-[#087442]">
                <CheckCircle2 size={25} strokeWidth={2.2} aria-hidden="true" />
              </span>
            )
          }
          tone={alertLevel === "WARNING" ? "amber" : "green"}
          label="Current Alert Level"
          value={alertLevel}
          sub={alertLevel === "WARNING" ? "Conditions are becoming concerning. Please monitor closely." : "No active sensor warning detected."}
          action="View Details"
          onAction={() => setPage("alerts")}
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f8f5e9]">
              <img src={dashboardIcons.alerts} alt="Active Alerts" className="dashboard-sensor-icon h-7 w-7 object-contain" />
            </span>
          }
          tone="amber"
          label="Active Alerts"
          value={String(activeAlertCount)}
          sub={activeAlertCount > 0 ? "Warning Level Alerts" : "No current alerts"}
          action="View Alerts"
          onAction={() => setPage("alerts")}
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
              <img src={dashboardIcons.sensor} alt="Sensor Status" className="h-7 w-7 object-contain" />
            </span>
          }
          tone={onlineSensorCount === sensorData.length ? "green" : "neutral"}
          label="Sensor Status"
          value={`${onlineSensorCount} / ${sensorData.length}`}
          sub={onlineSensorCount === sensorData.length ? "All sensors online" : `${sensorData.length - onlineSensorCount} sensor${sensorData.length - onlineSensorCount === 1 ? "" : "s"} offline`}
          action="View Sensors"
          onAction={() => setPage("sensors")}
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
              <img src={dashboardIcons.reports} alt="Incident Reports" className="dashboard-sensor-icon h-7 w-7 object-contain" />
            </span>
          }
          tone="green"
          label="Incident Reports"
          value={String(incidentReports.length)}
          sub="Total submitted reports"
          action="View Reports"
          onAction={() => setPage("incidents")}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <SectionPulseIcon className="w-6 h-6 shrink-0 text-[#0e7b42]" />
          <div>
            <h2 className="dashboard-section-title">
              Current Sensor Status
            </h2>
            <p className="mt-0.5 text-[0.7rem] text-[#718078]">
              Real-time readings from slope monitoring sensors
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {sensorData.map((sensor) => (
            <SensorCard key={sensor.name} sensor={sensor} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <ActivityList
          title="Recent Alerts"
          rows={recentAlertRows}
          action={() => setPage("alerts")}
        />
        <ActivityList
          title="Recent Incident Reports"
          rows={recentIncidentRows}
          action={() => setPage("incidents")}
        />
      </div>
      <div className="mt-8 pb-4 text-center text-xs text-[#718078]">
        © 2026 SlopeSense. All rights reserved.
      </div>
    </div>
  );
}

function ActivityList({ title, rows, action }) {
  const isIncidentList = title === "Recent Incident Reports";

  const rowIcon = (row, index) => {
    if (isIncidentList) {
      return (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eaf7ee]">
          <img src={dashboardIcons.reports} alt="Report" className="dashboard-sensor-icon h-5 w-5 object-contain" />
        </span>
      );
    }
    if (index === 0) {
      return (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eaf7ee]">
          <img src={dashboardIcons.warning} alt="Warning" className="dashboard-sensor-icon h-5 w-5 object-contain" />
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eaf7ee]">
          <img src={dashboardIcons.rain} alt="Rain" className="dashboard-sensor-icon h-5 w-5 object-contain" />
        </span>
      );
    }
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eaf7ee]">
        <img src={dashboardIcons.stable} alt="Tilt" className="dashboard-sensor-icon h-5 w-5 object-contain" />
      </span>
    );
  };

  return (
    <section className="dashboard-card p-5">
      <div className="flex items-center justify-between border-b border-[#edf0ed] pb-3">
        <h2 className="dashboard-section-title">
          {title}
        </h2>
        <button onClick={action} className="text-xs font-bold text-[#087442] hover:underline">
          View All <ChevronRight className="inline" size={14} />
        </button>
      </div>
      <div className="divide-y divide-[#edf0ed]">
        {rows.length === 0 ? (
          <div className="flex min-h-[92px] items-center justify-center px-4 py-6 text-center text-xs text-[#64748b]">
            No Firebase records available.
          </div>
        ) : rows.map((row, index) => (
          <div key={row[0]} className="flex min-h-[68px] items-center gap-3 py-3">
            {rowIcon(row, index)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-[#27352f]">{row[0]}</div>
              <div className="mt-0.5 truncate text-xs text-[#64748b]">{row[1]}</div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`status-badge ${
                  row[3] === "DANGER"
                    ? "bg-[#fee2e2] text-[#b91c1c] ring-1 ring-inset ring-[#fecaca]"
                    : row[3] === "WARNING" || row[3] === "PENDING"
                    ? "bg-[#f8f5e9] text-[#554d35] ring-1 ring-inset ring-[#ded5b5]"
                    : "bg-[#eaf7ee] text-[#276749] ring-1 ring-inset ring-[#cde8d6]"
                }`}
              >
                {row[3]}
              </span>
              <div className="mt-1 text-[0.68rem] text-[#7e8983]">{row[2]}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LegacyReferenceChart({ type }) {
  const config = {
    soil: {
      title: "SOIL MOISTURE (%)",
      legend: "Soil Moisture (%)",
      color: "#15803d",
      latest: "Latest: 72%",
      ticks: ["100%", "75%", "50%", "25%", "0%"],
      points: "10,95 26,90 44,95 62,86 80,82 98,70 116,80 134,60 152,65 170,48 188,56 206,42 224,50 240,30",
      area: "M10 95 L26 90 L44 95 L62 86 L80 82 L98 70 L116 80 L134 60 L152 65 L170 48 L188 56 L206 42 L224 50 L240 30 L240 118 L10 118 Z",
      showDots: true,
    },
    rain: {
      title: "RAIN SENSOR - ADC READING",
      legend: "Rain ADC",
      color: "#2f6f4e",
      latest: "Latest: 2,740",
      ticks: ["4000", "3000", "2000", "1000", "0"],
      points: "10,50 30,40 50,56 70,44 90,60 110,48 130,34 150,56 170,42 190,60 210,70 230,54 240,34",
      area: "M10 50 L30 40 L50 56 L70 44 L90 60 L110 48 L130 34 L150 56 L170 42 L190 60 L210 70 L230 54 L240 34 L240 118 L10 118 Z",
      showDots: true,
    },
    tilt: {
      title: "TILT SENSOR - DETECTION",
      legend: "Tilt Detected (1=Detected, 0=Stable)",
      color: "#2f6f4e",
      latest: "Latest: 0 (Stable)",
      ticks: ["1 (Detected)", "0 (Stable)"],
      event: true,
    },
    vibration: {
      title: "VIBRATION SENSOR - DETECTION",
      legend: "Vibration Detected (1=Detected, 0=Stable)",
      color: "#2f6f4e",
      latest: "Latest: 0 (No Vibration)",
      ticks: ["1 (Detected)", "0 (Stable)"],
      vibration: true,
    },
  }[type];

  const labels = ["10:00 AM", "4:00 PM", "10:00 PM", "4:00 AM"];

  return (
    <div className="flex flex-col min-w-0 rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-[0_2px_8px_rgba(20,61,42,0.03)]">
      <div className="text-xs font-extrabold uppercase tracking-tight text-center truncate" style={{ color: config.color }}>
        {config.title}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-[#64748b]">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
        <span className="truncate font-semibold">{config.legend}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="flex h-[130px] w-[54px] shrink-0 flex-col justify-between pb-4 pt-1 text-right text-[11px] font-semibold text-[#475569]">
          {config.ticks.map((tick) => (
            <span key={tick} className="truncate">{tick}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <svg viewBox="0 0 250 130" className="h-[130px] w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={config.color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <g stroke="#f1f5f9" strokeWidth="1">
              <line x1="10" y1="10" x2="240" y2="10" />
              <line x1="10" y1="37" x2="240" y2="37" />
              <line x1="10" y1="64" x2="240" y2="64" />
              <line x1="10" y1="91" x2="240" y2="91" />
              <line x1="10" y1="118" x2="240" y2="118" stroke="#cbd5e1" />
            </g>

            {config.area && <path d={config.area} fill={`url(#grad-${type})`} />}
            {config.points && (
              <polyline
                points={config.points}
                fill="none"
                stroke={config.color}
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {config.showDots &&
              config.points
                .split(" ")
                .map((pt, i) => {
                  const [cx, cy] = pt.split(",");
                  return <circle key={i} cx={cx} cy={cy} r="3" fill={config.color} />;
                })}

            {config.event && (
              <>
                <rect x="120" y="24" width="34" height="94" fill="#2f6f4e" fillOpacity="0.12" />
                <rect x="120" y="24" width="34" height="94" fill="none" stroke={config.color} strokeWidth="1.5" />
                <line x1="10" y1="118" x2="120" y2="118" stroke={config.color} strokeWidth="1.5" />
                <line x1="154" y1="118" x2="240" y2="118" stroke={config.color} strokeWidth="1.5" />
              </>
            )}

            {config.vibration && (
              <>
                <line x1="10" y1="118" x2="240" y2="118" stroke={config.color} strokeWidth="1" />
                {[45, 100, 190, 200].map((x) => (
                  <path
                    key={x}
                    d={`M${x} 118 L${x} 60 L${x + 6} 60 L${x + 6} 118`}
                    fill="none"
                    stroke={config.color}
                    strokeWidth="1.5"
                  />
                ))}
              </>
            )}
          </svg>

          <div className="mt-2 flex justify-between text-[11px] font-semibold text-[#475569]">
            {labels.map((lbl) => (
              <span key={lbl}>{lbl}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-xs font-extrabold" style={{ color: config.color }}>
        {config.latest}
      </div>
    </div>
  );
}

function MonitoringThresholdGuide() {
  const groups = [
    {
      title: "Soil Moisture",
      icon: Droplet,
      ranges: ["Below 40% · Normal", "40–59% · Caution", "60–79% · Warning", "80% or higher · Danger"],
    },
    {
      title: "Rainfall (0–1023 ADC)",
      icon: CloudRain,
      ranges: ["0–300 · Dry", "301–600 · Light", "601–800 · Moderate", "801–1023 · Heavy"],
    },
    {
      title: "Tilt and Vibration",
      icon: Activity,
      ranges: ["Stable · No movement detected", "Detected · Warning indicator"],
    },
  ];

  return (
    <section className="dashboard-card p-5 sm:p-6">
      <h2 className="dashboard-section-title">Monitoring Threshold Guide</h2>
      <div className="mt-4 space-y-4">
        {groups.map(({ title, icon: Icon, ranges }) => (
          <div key={title} className="rounded-lg border border-[#e5ebe7] bg-[#fafcfb] p-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#27352f]">
              <Icon size={16} className="text-[#2f6f4e]" />
              {title}
            </div>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#64748b]">
              {ranges.map((range) => (
                <li key={range} className="flex gap-2">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${range.includes("Danger") ? "bg-[#b91c1c]" : "bg-[#5f806d]"}`} />
                  <span>{range}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-[#dfe7e1] bg-[#f6faf7] p-3 text-xs leading-5 text-[#526057]">
        Sensor classifications describe individual readings. The overall system reaches Danger only when the configured alert logic identifies a critical condition.
      </div>
    </section>
  );
}

const historyTypeAliases = {
  soil: ["soil", "soilSensor", "soilMoisture"],
  rain: ["rain", "rainSensor", "slope-01"],
  tilt: ["tilt", "tiltSensor"],
  vibration: ["vibration", "vibrationSensor"],
};

const getHistoryTimestamp = (record = {}) => {
  const value = Number(record.timestamp ?? record.createdAt ?? record.recordedAt ?? record.time ?? 0);
  return value > 0 && value < 1e12 ? value * 1000 : value;
};

const getHistoryValue = (type, record = {}) => {
  if (type === "soil") return Number(record.moisturePercent ?? record.value ?? 0);
  if (type === "rain") return Number(record.rawValue ?? record.value ?? 0);
  if (type === "tilt") return getDetectionState(record, ["tiltDetected", "detected", "value", "level", "status"]) ? 1 : 0;
  return getDetectionState(record, ["vibrationDetected", "detected", "value", "level", "status"]) ? 1 : 0;
};

const normalizeSensorHistory = (value = {}) => Object.fromEntries(
  Object.entries(historyTypeAliases).map(([type, aliases]) => {
    const source = aliases.map((alias) => value?.[alias]).find(Boolean) ?? {};
    const recordsSource = source.history ?? source.readings ?? source;
    const records = (Array.isArray(recordsSource) ? recordsSource : Object.values(recordsSource ?? {}))
      .filter((record) => record && typeof record === "object" && getHistoryTimestamp(record) > 0)
      .sort((a, b) => getHistoryTimestamp(a) - getHistoryTimestamp(b));
    return [type, records];
  })
);

function ReferenceChart({ type, records = [] }) {
  const config = {
    soil: { title: "Soil Moisture Trend", label: "Moisture (%)", max: 100, ticks: ["100%", "50%", "0%"] },
    rain: { title: "Rainfall History", label: "Rainfall (ADC)", max: 1023, ticks: ["1023", "512", "0"] },
    tilt: { title: "Slope Movement Events", label: "Stable / detected", max: 1, ticks: ["Detected", "Stable"] },
    vibration: { title: "Ground Vibration Events", label: "Stable / detected", max: 1, ticks: ["Detected", "Stable"] },
  }[type];
  const values = records.map((record) => ({ timestamp: getHistoryTimestamp(record), value: getHistoryValue(type, record) })).filter((record) => record.timestamp > 0);
  const start = values[0]?.timestamp ?? 0;
  const end = values.at(-1)?.timestamp ?? start;
  const span = Math.max(end - start, 1);
  const points = values.map((record) => {
    const x = 10 + ((record.timestamp - start) / span) * 230;
    const y = 112 - (Math.min(Math.max(record.value, 0), config.max) / config.max) * 96;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="dashboard-card flex min-h-[250px] min-w-0 flex-col p-4">
      <div className="text-center text-sm font-bold text-[#27352f]">{config.title}</div>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#64748b]">
        <span className="h-2 w-2 rounded-full bg-[#2f6f4e]" />
        <span>{config.label}</span>
      </div>
      {values.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#d7e1da] bg-[#f8fbf9] px-4 text-center text-xs leading-5 text-[#64748b]">
          No timestamped Firebase history for this period.
        </div>
      ) : (
        <div className="mt-4 flex flex-1 gap-3">
          <div className="flex h-[150px] w-14 shrink-0 flex-col justify-between py-1 text-right text-[10px] font-medium text-[#64748b]">
            {config.ticks.map((tick) => <span key={tick}>{tick}</span>)}
          </div>
          <div className="min-w-0 flex-1">
            <svg viewBox="0 0 250 120" className="h-[150px] w-full" preserveAspectRatio="none" aria-label={`${config.title} chart`}>
              <g stroke="#e8eeea" strokeWidth="1">
                <line x1="10" y1="16" x2="240" y2="16" />
                <line x1="10" y1="64" x2="240" y2="64" />
                <line x1="10" y1="112" x2="240" y2="112" />
              </g>
              <polyline points={points} fill="none" stroke="#2f6f4e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {values.map((record, index) => {
                const [cx, cy] = points.split(" ")[index].split(",");
                return <circle key={`${record.timestamp}-${index}`} cx={cx} cy={cy} r="3" fill="#2f6f4e" />;
              })}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-[#718078]">
              <span>{new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <span>{new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveReadingCard({ sensor }) {
  const offline = !sensor || sensor.state === "OFFLINE";

  return (
    <div className="dashboard-card flex min-h-[170px] flex-col p-4">
      <div className="dashboard-eyebrow">{sensor?.name || "Sensor"}</div>
      <div className="mt-1 text-xs text-[#64748b]">{sensor?.code || "Live Firebase reading"}</div>
      <div className={`mt-5 text-2xl font-extrabold tracking-tight ${offline ? "text-[#64748b]" : "text-[#27352f]"}`}>
        {sensor?.value ?? "—"}
      </div>
      <div className="mt-1 text-xs leading-5 text-[#64748b]">
        {sensor?.detail || "No Firebase reading available."}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-[#eef1ee] pt-3 text-xs text-[#718078]">
        <span>{offline ? "Offline" : "Live snapshot"}</span>
        <span>{sensor?.updated || "Unavailable"}</span>
      </div>
    </div>
  );
}

const soilClassification = (value) => value >= 80 ? "Danger" : value >= 60 ? "Warning" : value >= 40 ? "Caution" : "Normal";
const rainClassification = (value) => value >= 801 ? "Heavy" : value >= 601 ? "Moderate" : value >= 301 ? "Light" : "Dry";

const buildEnvironmentalEvents = (history = {}) => {
  const events = [];
  const addTransitions = (type, classify, label, reading) => {
    let previous = null;
    (history[type] ?? []).forEach((record) => {
      const current = classify(getHistoryValue(type, record));
      if (previous !== null && current !== previous) {
        events.push({
          timestamp: getHistoryTimestamp(record),
          event: `${label} changed from ${previous} to ${current}`,
          reading: reading(getHistoryValue(type, record), current),
          status: current === "Danger" ? "DANGER" : current === "Normal" || current === "Dry" ? "NORMAL" : "WARNING",
        });
      }
      previous = current;
    });
  };

  addTransitions("soil", soilClassification, "Soil moisture", (value, status) => `${value}% · ${status}`);
  addTransitions("rain", rainClassification, "Rainfall", (value, status) => `${value} ADC · ${status}`);

  ["tilt", "vibration"].forEach((type) => {
    let previouslyDetected = false;
    (history[type] ?? []).forEach((record) => {
      const detected = getHistoryValue(type, record) === 1;
      if (detected && !previouslyDetected) {
        events.push({
          timestamp: getHistoryTimestamp(record),
          event: type === "tilt" ? "Slope movement detected" : "Ground vibration detected",
          reading: "Detected",
          status: "WARNING",
        });
      }
      previouslyDetected = detected;
    });
  });

  return events.filter((event) => event.timestamp > 0).sort((a, b) => b.timestamp - a.timestamp);
};

function SensorsPage({ monitoringSensorData = [], sensorHistory = {} }) {
  const [activeTimeRange, setActiveTimeRange] = useState("24H");
  const rangeMilliseconds = { "1H": 60 * 60 * 1000, "6H": 6 * 60 * 60 * 1000, "24H": 24 * 60 * 60 * 1000, "7D": 7 * 24 * 60 * 60 * 1000 };
  const cutoff = Date.now() - rangeMilliseconds[activeTimeRange];
  const filteredHistory = Object.fromEntries(
    Object.keys(historyTypeAliases).map((type) => [type, (sensorHistory[type] ?? []).filter((record) => getHistoryTimestamp(record) >= cutoff)])
  );
  const environmentalEvents = buildEnvironmentalEvents(sensorHistory);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {monitoringSensorData.map((sensor) => (
          <MonitoringSensorCard key={sensor.name} sensor={sensor} />
        ))}
      </div>

      <section className="dashboard-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0ed] pb-4">
          <div>
            <h2 className="dashboard-section-title">
              Sensor Reading History
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">Timestamped Firebase readings for the selected period.</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-[#dfe7e1] bg-white p-1">
            {["1H", "6H", "24H", "7D"].map((range) => (
              <button key={range} onClick={() => setActiveTimeRange(range)} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTimeRange === range ? "bg-[#006b37] text-white shadow-sm" : "text-[#64748b] hover:bg-[#f3f7f4]"}`}>
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {["soil", "rain", "tilt", "vibration"].map((type) => (
            <ReferenceChart key={type} type={type} records={filteredHistory[type]} />
          ))}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#dfe7e1] bg-[#f6faf7] px-4 py-3 text-xs leading-5 text-[#526057]">
          <Info size={16} className="shrink-0 text-[#087442]" />
          <span>
            Charts use timestamped Firebase history only. If a period is empty, no stored readings were available for that range.
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="dashboard-card p-5 sm:p-6">
          <h2 className="dashboard-section-title">
            Environmental Event History
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e9e6] pb-3 text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[#64748b]">
                  <th className="pb-3 pr-4 font-extrabold">Time</th>
                  <th className="pb-3 pr-4 font-extrabold">Event</th>
                  <th className="pb-3 pr-4 font-extrabold">Reading / Condition</th>
                  <th className="pb-3 text-right font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {environmentalEvents.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-xs text-[#64748b]">No meaningful environmental events are stored in Firebase yet.</td></tr>
                ) : environmentalEvents.map((row) => (
                  <tr key={`${row.timestamp}-${row.event}`} className="text-xs text-[#475569] hover:bg-[#f8fbf9]">
                    <td className="py-3.5 pr-4 whitespace-nowrap">{new Date(row.timestamp).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td className="py-3.5 pr-4 font-bold text-[#1e293b]">{row.event}</td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">{row.reading}</td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-[0.65rem] font-extrabold tracking-wider ${
                          row.status === "DANGER"
                            ? "bg-[#fee2e2] text-[#b91c1c] ring-1 ring-inset ring-[#fecaca]"
                            : row.status === "WARNING"
                            ? "bg-[#f8f5e9] text-[#554d35] ring-1 ring-inset ring-[#ded5b5]"
                            : "bg-[#eaf7ee] text-[#15803d]"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-center">
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-5 py-2.5 text-xs font-bold text-[#27352f] shadow-sm hover:bg-[#f8fafc] transition">
              View Complete Sensor History <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <MonitoringThresholdGuide />
      </div>
    </div>
  );
}

function MiniChart({ title, color, values, value }) {
  return <div><div className="flex items-start justify-between gap-2"><div><div className="text-[0.63rem] font-extrabold uppercase text-[#53635a]">{title}</div><div className="mt-1 text-[0.58rem] text-[#9aa39e]">Last 24 hours</div></div><div className="text-[0.72rem] font-extrabold" style={{ color }}>{value}</div></div><div className="mt-4 flex h-[100px] items-end gap-1 border-b border-l border-[#e5ebe6] px-2 pb-0 pt-3">{values.map((height, index) => <div key={index} className="flex-1 rounded-t-sm opacity-85" style={{ height: `${height}%`, backgroundColor: color }} />)}</div><div className="mt-2 flex justify-between text-[0.52rem] text-[#a3aca7]"><span>10:00 AM</span><span>4:00 PM</span><span>4:00 AM</span></div></div>;
}

function buildLiveAlertsFromSensors(liveSensors = {}) {
  if (!Object.values(liveSensors).some((sensor) => sensor && Object.keys(sensor).length > 0)) {
    return [];
  }

  const soil = liveSensors.soil ?? {};
  const rain = liveSensors.rain ?? {};
  const tilt = liveSensors.tilt ?? {};
  const vibration = liveSensors.vibration ?? {};
  const soilMoisture = Number(soil.moisturePercent ?? 0);
  const rainRaw = Number(rain.rawValue ?? 0);
  const rainLevel = String(rain.level ?? "DRY").toUpperCase();
  const soilTriggered = soilMoisture >= 70;
  const rainTriggered = rainRaw > 0 || rainLevel !== "DRY";
  const tiltTriggered = getDetectionState(tilt, ["tiltDetected", "detected", "value", "level", "status"]);
  const vibrationTriggered = getDetectionState(vibration, ["vibrationDetected", "detected", "value", "level", "status"]);

  const alerts = [];

  if (soilTriggered) {
    alerts.push({
      id: "ALT-SOIL",
      title: "High Soil Moisture Detected",
      description: `Soil moisture reached ${soilMoisture}% and exceeds the critical threshold.`,
      device: "soilSensor",
      sensorType: "Soil Moisture Sensor",
      location: "Barangay Malinao",
      subLocation: "Slope monitoring area",
      severity: "CRITICAL",
      status: "New",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      reading: `${soilMoisture}%`,
      threshold: "70%",
    });
  }

  if (rainTriggered) {
    alerts.push({
      id: "ALT-RAIN",
      title: "Rain Detected",
      description: `Rain sensor ${rainLevel === "DRY" ? "reported activity" : "is detecting rainfall"} at ${rainRaw} ADC.`,
      device: "slope-01",
      sensorType: "Rain Sensor",
      location: "Barangay Malinao",
      subLocation: "Slope monitoring area",
      severity: "CRITICAL",
      status: "New",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      reading: `${rainRaw} ADC`,
      threshold: "0 ADC or dry state",
    });
  }

  if (tiltTriggered) {
    alerts.push({
      id: "ALT-TILT",
      title: "Tilt Detected",
      description: "The tilt sensor detected a change in slope position.",
      device: "tiltSensor",
      sensorType: "Tilt Sensor",
      location: "Barangay Malinao",
      subLocation: "Slope monitoring area",
      severity: "CRITICAL",
      status: "New",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      reading: "Detected",
      threshold: "No movement",
    });
  }

  if (vibrationTriggered) {
    alerts.push({
      id: "ALT-VIBRATION",
      title: "Vibration Detected",
      description: "The vibration sensor detected ground movement.",
      device: "vibrationSensor",
      sensorType: "Vibration Sensor",
      location: "Barangay Malinao",
      subLocation: "Slope monitoring area",
      severity: "CRITICAL",
      status: "New",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      reading: "Detected",
      threshold: "No movement",
    });
  }

  if (alerts.length === 0) {
    return [{
      id: "ALT-NORMAL",
      title: "No Active Alerts",
      description: "Current Firebase sensor readings are normal. No moisture or rainfall alert is active.",
      device: "System",
      sensorType: "Auto Monitor",
      location: "Barangay Malinao",
      subLocation: "Slope monitoring area",
      severity: "INFO",
      status: "Resolved",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      reading: "Normal",
      threshold: "N/A",
    }];
  }

  return alerts;
}

function SensorSettingsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="sensor-settings-title">
        <div className="flex items-center justify-between border-b border-[#edf0ed] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Settings size={20} className="text-[#006b37]" />
            <h3 id="sensor-settings-title" className="text-base font-bold text-[#111827]">Sensor Settings</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100" aria-label="Close sensor settings">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#1f2937]">Soil Moisture Warning Threshold (%)</label>
            <p className="mb-1.5 text-[11px] text-[#64748b]">Sets the moisture level that requires administrator attention.</p>
            <input type="number" min="0" max="100" defaultValue={70} className="w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]" />
          </div>

          <div>
            <label className="block font-bold text-[#1f2937]">Rainfall Trigger Threshold (ADC)</label>
            <p className="mb-1.5 text-[11px] text-[#64748b]">Uses the calibrated rain sensor range from 0 to 1023 ADC.</p>
            <input type="number" min="0" max="1023" defaultValue={601} className="w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]" />
          </div>

          <div>
            <label className="block font-bold text-[#1f2937]">Tilt and Vibration Sensitivity</label>
            <select defaultValue="medium" className="mt-1.5 w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]">
              <option value="high">High sensitivity (instant trigger)</option>
              <option value="medium">Medium sensitivity (recommended)</option>
              <option value="low">Low sensitivity (filtered)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#edf0ed] pt-4">
            <button onClick={onClose} className="rounded-lg border border-[#dfe7e1] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-slate-50">Cancel</button>
            <button onClick={() => { onClose(); toast.success("Sensor settings saved successfully."); }} className="rounded-lg bg-[#006b37] px-4 py-2 text-xs font-bold text-white hover:bg-[#00522a]">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const buildReadableLiveAlerts = (liveSensors = {}, location = "Monitoring location unavailable") => {
  const soil = liveSensors.soil ?? {};
  const rain = liveSensors.rain ?? {};
  const tilt = liveSensors.tilt ?? {};
  const vibration = liveSensors.vibration ?? {};
  const soilMoisture = Number(soil.moisturePercent ?? 0);
  const rainValue = Number(rain.rawValue ?? 0);
  const tiltDetected = getDetectionState(tilt, ["tiltDetected", "detected", "value", "level", "status"]);
  const vibrationDetected = getDetectionState(vibration, ["vibrationDetected", "detected", "value", "level", "status"]);
  const movementDetected = tiltDetected || vibrationDetected;
  const detectedAt = Math.max(Number(soil.receivedAt ?? 0), Number(rain.receivedAt ?? 0), Number(tilt.receivedAt ?? 0), Number(vibration.receivedAt ?? 0));
  const alerts = [];

  if (rainValue >= 801 && soilMoisture >= 80 && movementDetected) {
    alerts.push({
      id: "danger-combined",
      title: "Danger — Multiple Warning Signs",
      description: "Heavy rainfall, high soil moisture, and possible ground movement were detected. Immediate BDRRMC review is needed.",
      location,
      detectedAt,
      condition: "Danger",
      status: "attention",
      recommended: "Review the monitored area and coordinate the appropriate BDRRMC response.",
      danger: true,
    });
    return alerts;
  }

  if (rainValue >= 601) {
    const heavy = rainValue >= 801;
    alerts.push({
      id: "rainfall",
      title: heavy ? "Heavy Rainfall Detected" : "Moderate Rainfall Detected",
      description: heavy
        ? "Heavy rainfall is affecting the monitored area. Stay alert for further changes."
        : "Rainfall is increasing in the monitored area. Continue monitoring conditions.",
      location,
      detectedAt: Number(rain.receivedAt ?? detectedAt),
      condition: heavy ? "Heavy rainfall" : "Moderate rainfall",
      status: "attention",
      recommended: "Continue observing rainfall and related slope conditions.",
    });
  }

  if (soilMoisture >= 60) {
    const high = soilMoisture >= 80;
    alerts.push({
      id: "soil-moisture",
      title: high ? "High Soil Moisture Detected" : "Elevated Soil Moisture",
      description: high
        ? "The monitored soil has become highly saturated. Watch for additional warning signs."
        : "Soil moisture is increasing in the monitored area.",
      location,
      detectedAt: Number(soil.receivedAt ?? detectedAt),
      condition: high ? "High soil moisture" : "Elevated soil moisture",
      status: "attention",
      recommended: "Monitor rainfall and movement sensors for additional changes.",
    });
  }

  if (tiltDetected) {
    alerts.push({
      id: "slope-movement",
      title: "Possible Slope Movement",
      description: "A change in slope position was detected. Review the monitored area's condition.",
      location,
      detectedAt: Number(tilt.receivedAt ?? detectedAt),
      condition: "Movement detected",
      status: "attention",
      recommended: "Inspect the monitored condition and compare it with rainfall and soil moisture readings.",
    });
  }

  if (vibrationDetected) {
    alerts.push({
      id: "ground-vibration",
      title: "Ground Vibration Detected",
      description: "Unusual ground vibration was detected. Continue monitoring for further changes.",
      location,
      detectedAt: Number(vibration.receivedAt ?? detectedAt),
      condition: "Vibration detected",
      status: "attention",
      recommended: "Continue monitoring and review the area if vibration persists.",
    });
  }

  return alerts.sort((a, b) => b.detectedAt - a.detectedAt);
};

function SimplifiedAlertsPage({ liveSensors = {}, profile = {}, setPage }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const barangay = profile.barangay ? (/^barangay\b/i.test(profile.barangay) ? profile.barangay : `Barangay ${profile.barangay}`) : "Monitoring area";
  const location = [barangay, profile.city].filter(Boolean).join(", ");
  const alerts = buildReadableLiveAlerts(liveSensors, location);
  const activeCount = alerts.filter((alert) => alert.status === "attention").length;
  const resolvedCount = alerts.filter((alert) => alert.status === "resolved").length;
  const visibleAlerts = alerts.filter((alert) => {
    const matchesFilter = filter === "all" || alert.status === filter;
    const query = searchTerm.trim().toLowerCase();
    return matchesFilter && (!query || [alert.title, alert.description, alert.location, alert.condition].some((value) => value.toLowerCase().includes(query)));
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#554d35]"><AlertTriangle size={16} /> Needs Attention</div>
          <div className="mt-3 text-2xl font-extrabold text-[#27352f]">{activeCount}</div>
          <div className="mt-1 text-xs text-[#64748b]">Active warnings requiring review</div>
        </div>
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#276749]"><CheckCircle2 size={16} /> Resolved</div>
          <div className="mt-3 text-2xl font-extrabold text-[#27352f]">{resolvedCount}</div>
          <div className="mt-1 text-xs text-[#64748b]">Verified resolved alerts</div>
        </div>
      </div>

      <section className="dashboard-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e7ece8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#27352f]">Recent Alerts</h2>
            <p className="mt-0.5 text-xs text-[#64748b]">Newest conditions appear first.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-3 py-2 text-[#64748b]">
              <Search size={15} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search alerts" className="w-full bg-transparent text-xs text-[#27352f] outline-none sm:w-48" />
            </div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-[#dfe7e1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] outline-none focus:border-[#087442]">
              <option value="all">All</option>
              <option value="attention">Needs Attention</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#edf0ed]">
          {visibleAlerts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 size={28} className="mx-auto text-[#2f6f4e]" />
              <div className="mt-3 text-sm font-bold text-[#27352f]">No alerts match this view</div>
              <p className="mt-1 text-xs text-[#64748b]">Current Firebase readings do not show a condition requiring attention.</p>
            </div>
          ) : visibleAlerts.slice(0, 10).map((alert) => (
            <article key={alert.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${alert.danger ? "bg-[#fee2e2] text-[#b91c1c]" : "bg-[#f8f5e9] text-[#6b5f38]"}`}>
                  <AlertTriangle size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-bold text-[#27352f]">{alert.title}</h3>
                    <time className="shrink-0 text-[11px] text-[#718078]" dateTime={new Date(alert.detectedAt).toISOString()}>{new Date(alert.detectedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">{alert.description}</p>
                  <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[#526057]"><MapPin size={13} /> {alert.location}</span>
                    <button onClick={() => setSelectedAlert(alert)} className="inline-flex items-center gap-1 font-bold text-[#087442] hover:underline">View Details <ChevronRight size={13} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="alert-detail-title">
            <div className="flex items-start justify-between gap-4 border-b border-[#edf0ed] pb-4">
              <div><h3 id="alert-detail-title" className="text-lg font-bold text-[#27352f]">{selectedAlert.title}</h3><p className="mt-1 text-xs leading-5 text-[#64748b]">{selectedAlert.description}</p></div>
              <button onClick={() => setSelectedAlert(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100" aria-label="Close alert details"><X size={18} /></button>
            </div>
            <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
              <div><dt className="font-medium text-[#64748b]">Monitoring location</dt><dd className="mt-1 font-bold text-[#27352f]">{selectedAlert.location}</dd></div>
              <div><dt className="font-medium text-[#64748b]">Date and time detected</dt><dd className="mt-1 font-bold text-[#27352f]">{new Date(selectedAlert.detectedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}</dd></div>
              <div><dt className="font-medium text-[#64748b]">Current condition</dt><dd className={`mt-1 font-bold ${selectedAlert.danger ? "text-[#b91c1c]" : "text-[#554d35]"}`}>{selectedAlert.condition}</dd></div>
              <div><dt className="font-medium text-[#64748b]">Recommended next step</dt><dd className="mt-1 font-bold leading-5 text-[#27352f]">{selectedAlert.recommended}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end border-t border-[#edf0ed] pt-4"><button onClick={() => { setSelectedAlert(null); setPage("sensors"); }} className="rounded-lg bg-[#087442] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#065e35]">Open Sensor Monitoring</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsPage({ markAllTrigger, liveSensors = {} }) {
  const [alerts, setAlerts] = useState(() => buildLiveAlertsFromSensors(liveSensors));

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All Severities");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deviceFilter, setDeviceFilter] = useState("All Devices");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const lastTriggerRef = useRef(markAllTrigger);

  useEffect(() => {
    setAlerts(buildLiveAlertsFromSensors(liveSensors));
  }, [liveSensors]);

  useEffect(() => {
    if (markAllTrigger > 0 && markAllTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = markAllTrigger;
      setAlerts((prev) =>
        prev.map((a) => (a.status === "New" ? { ...a, status: "In Progress" } : a))
      );
      toast.success("All active alerts marked as read.");
    }
  }, [markAllTrigger]);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.subLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity =
      severityFilter === "All Severities" ||
      alert.severity.toUpperCase() === severityFilter.toUpperCase();

    const matchesStatus =
      statusFilter === "All Status" ||
      alert.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesDevice =
      deviceFilter === "All Devices" ||
      alert.device === deviceFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesDevice;
  });

  const handleStatusChange = (alertId, newStatus) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
    if (selectedAlert && selectedAlert.id === alertId) {
      setSelectedAlert((prev) => ({ ...prev, status: newStatus }));
    }
    toast.success(`Alert ${alertId} updated to ${newStatus}.`);
  };

  const statCards = [
    {
      id: "critical",
      icon: dashboardIcons.alertCritical,
      value: alerts.filter((alert) => alert.severity === "CRITICAL").length,
      label: "Critical Alerts",
      badge: "Requires immediate action",
      valueClass: "text-[#e11d48]",
      badgeClass: "bg-[#ffe4e8] text-[#e11d48]",
    },
    {
      id: "warning",
      icon: dashboardIcons.alertWarning,
      value: alerts.filter((alert) => alert.severity === "WARNING").length,
      label: "Warning Alerts",
      badge: "Needs attention",
      valueClass: "text-[#ea580c]",
      badgeClass: "bg-[#fff7ed] text-[#ea580c]",
    },
    {
      id: "info",
      icon: dashboardIcons.alertInfo,
      value: alerts.filter((alert) => alert.severity === "INFO").length,
      label: "Informational",
      badge: "For your information",
      valueClass: "text-[#2563eb]",
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      id: "resolved",
      icon: dashboardIcons.alertResolved,
      value: alerts.filter((alert) => alert.status === "Resolved").length,
      label: "Resolved Today",
      badge: "Closed alerts",
      valueClass: "text-[#15803d]",
      badgeClass: "bg-[#f0fdf4] text-[#15803d]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-4 rounded-xl border border-[#dfe7e1] bg-white p-5 shadow-[0_4px_14px_rgba(20,61,42,0.03)]"
          >
            <img
              src={card.icon}
              alt={card.label}
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className={`text-3xl font-black leading-tight ${card.valueClass}`}>
                {card.value}
              </div>
              <div className="mt-0.5 text-xs sm:text-sm font-bold text-[#1f2937]">
                {card.label}
              </div>
              <span
                className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${card.badgeClass}`}
              >
                {card.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#dfe7e1] bg-white py-2 pl-9 pr-4 text-xs text-[#1e293b] placeholder-[#94a3b8] outline-none transition focus:border-[#006b37]"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] outline-none transition hover:border-[#006b37] focus:border-[#006b37]"
          >
            <option>All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] outline-none transition hover:border-[#006b37] focus:border-[#006b37]"
          >
            <option>All Status</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] outline-none transition hover:border-[#006b37] focus:border-[#006b37]"
          >
            <option>All Devices</option>
            <option value="Device 01">Device 01</option>
            <option value="Device 02">Device 02</option>
            <option value="Device 03">Device 03</option>
            <option value="Device 04">Device 04</option>
            <option value="Device 05">Device 05</option>
          </select>
        </div>

        <button
          onClick={() => toast.info("Date range: May 20, 2025 - May 27, 2025")}
          className="flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] shadow-sm hover:bg-slate-50 transition"
        >
          <CalendarDays size={14} className="text-[#64748b]" />
          <span>May 20, 2025 - May 27, 2025</span>
          <ChevronDown size={14} className="text-[#64748b]" />
        </button>
      </div>

      {/* Alerts Table */}
      <div className="rounded-xl border border-[#dfe7e1] bg-white shadow-[0_4px_14px_rgba(20,61,42,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dfe7e1] bg-[#f8faf9] text-[0.72rem] font-bold text-[#475569]">
                <th className="py-3.5 pl-6 pr-4 font-bold">Alert</th>
                <th className="py-3.5 px-4 font-bold">Device</th>
                <th className="py-3.5 px-4 font-bold">Location</th>
                <th className="py-3.5 px-4 font-bold">Severity</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">
                  <div className="flex items-center gap-1">
                    Time <ArrowDown size={13} className="text-[#006b37]" />
                  </div>
                </th>
                <th className="py-3.5 pl-4 pr-6 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#94a3b8]">
                    No alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === "CRITICAL";
                  const isWarning = alert.severity === "WARNING";
                  const isInfo = alert.severity === "INFO";

                  return (
                    <tr key={alert.id} className="hover:bg-[#fbfcfb] transition">
                      {/* Alert Title & Subtitle + Row Icon */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                              isCritical
                                ? "bg-[#fee2e2] text-[#e11d48]"
                                : isWarning
                                ? "bg-[#ffedd5] text-[#ea580c]"
                                : "bg-[#eff6ff] text-[#2563eb]"
                            }`}
                          >
                            {isCritical ? (
                              <AlertTriangle size={18} strokeWidth={2.3} />
                            ) : isWarning ? (
                              <span className="text-base font-black leading-none select-none">!</span>
                            ) : (
                              <Info size={18} strokeWidth={2.3} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-[#111827] text-sm">
                              {alert.title}
                            </div>
                            <div className="text-xs text-[#64748b]">
                              {alert.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#111827] text-xs sm:text-sm">
                          {alert.device}
                        </div>
                        <div className="text-xs text-[#64748b]">{alert.sensorType}</div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#111827] text-xs sm:text-sm">
                          {alert.location}
                        </div>
                        <div className="text-xs text-[#64748b]">{alert.subLocation}</div>
                      </td>

                      {/* Severity Badge */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-extrabold tracking-wider ${
                            isCritical
                              ? "bg-[#ffe4e8] text-[#e11d48]"
                              : isWarning
                              ? "bg-[#fff7ed] text-[#ea580c]"
                              : "bg-[#eff6ff] text-[#2563eb]"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                            alert.status === "New"
                              ? "text-[#e11d48]"
                              : alert.status === "In Progress"
                              ? "text-[#ea580c]"
                              : "text-[#15803d]"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              alert.status === "New"
                                ? "bg-[#e11d48]"
                                : alert.status === "In Progress"
                                ? "bg-[#ea580c]"
                                : "bg-[#15803d]"
                            }`}
                          />
                          {alert.status}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#111827] text-xs sm:text-sm">
                          {alert.date}
                        </div>
                        <div className="text-xs text-[#64748b]">{alert.time}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-[#dfe7e1] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] shadow-sm transition"
                          title="View Alert Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dfe7e1] px-6 py-4">
          <div className="text-xs font-medium text-[#64748b]">
            Showing 1 to {filteredAlerts.length} of 50 alerts
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe7e1] text-[#64748b] hover:bg-[#f8fafc] disabled:opacity-40 transition"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`grid h-8 min-w-[32px] px-2 place-items-center rounded-lg ${
                currentPage === 1
                  ? "bg-[#006b37] text-white shadow-sm"
                  : "border border-[#dfe7e1] text-[#334155] hover:bg-[#f8fafc]"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`grid h-8 min-w-[32px] px-2 place-items-center rounded-lg ${
                currentPage === 2
                  ? "bg-[#006b37] text-white shadow-sm"
                  : "border border-[#dfe7e1] text-[#334155] hover:bg-[#f8fafc]"
              }`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`grid h-8 min-w-[32px] px-2 place-items-center rounded-lg ${
                currentPage === 3
                  ? "bg-[#006b37] text-white shadow-sm"
                  : "border border-[#dfe7e1] text-[#334155] hover:bg-[#f8fafc]"
              }`}
            >
              3
            </button>
            <span className="px-1 text-[#94a3b8]">...</span>
            <button
              onClick={() => setCurrentPage(10)}
              className={`grid h-8 min-w-[32px] px-2 place-items-center rounded-lg ${
                currentPage === 10
                  ? "bg-[#006b37] text-white shadow-sm"
                  : "border border-[#dfe7e1] text-[#334155] hover:bg-[#f8fafc]"
              }`}
            >
              10
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(10, p + 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe7e1] text-[#64748b] hover:bg-[#f8fafc] transition"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#edf0ed] pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    selectedAlert.severity === "CRITICAL"
                      ? "bg-[#fee2e2] text-[#e11d48]"
                      : selectedAlert.severity === "WARNING"
                      ? "bg-[#ffedd5] text-[#ea580c]"
                      : "bg-[#eff6ff] text-[#2563eb]"
                  }`}
                >
                  <AlertTriangle size={20} strokeWidth={2.3} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#64748b]">{selectedAlert.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        selectedAlert.severity === "CRITICAL"
                          ? "bg-[#ffe4e8] text-[#e11d48]"
                          : selectedAlert.severity === "WARNING"
                          ? "bg-[#fff7ed] text-[#ea580c]"
                          : "bg-[#eff6ff] text-[#2563eb]"
                      }`}
                    >
                      {selectedAlert.severity}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827] mt-0.5">
                    {selectedAlert.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-[#f8faf9] p-3.5 border border-[#e5e9e6]">
                <div className="text-[11px] font-bold uppercase text-[#64748b]">Description</div>
                <div className="mt-1 text-sm font-semibold text-[#1f2937]">
                  {selectedAlert.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold text-[#64748b]">Sensor & Device</div>
                  <div className="mt-1 font-bold text-[#111827]">{selectedAlert.device}</div>
                  <div className="text-xs text-[#64748b]">{selectedAlert.sensorType}</div>
                </div>

                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold text-[#64748b]">Location</div>
                  <div className="mt-1 font-bold text-[#111827]">{selectedAlert.location}</div>
                  <div className="text-xs text-[#64748b]">{selectedAlert.subLocation}</div>
                </div>

                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold text-[#64748b]">Sensor Reading</div>
                  <div className="mt-1 font-bold text-[#e11d48]">{selectedAlert.reading}</div>
                  <div className="text-[11px] text-[#64748b]">Threshold: {selectedAlert.threshold}</div>
                </div>

                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold text-[#64748b]">Timestamp</div>
                  <div className="mt-1 font-bold text-[#111827]">{selectedAlert.time}</div>
                  <div className="text-[11px] text-[#64748b]">{selectedAlert.date}</div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#edf0ed] pt-4">
                <div className="text-xs font-semibold text-[#64748b]">
                  Update Status:
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedAlert.id, "In Progress")}
                    className="rounded-lg border border-[#ea580c] bg-[#fff7ed] px-3 py-1.5 text-xs font-bold text-[#ea580c] hover:bg-[#ffedd5] transition"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedAlert.id, "Resolved")}
                    className="rounded-lg bg-[#006b37] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#00522a] transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function IncidentReportsPage({ highlightedReportId, setHighlightedReportId }) {
  const [reports, setReports] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Incident Types");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const previousReportIdsRef = useRef(new Set());

  useEffect(() => {
    if (!firebaseDatabase) return;

    const usersRef = dbRef(firebaseDatabase, "users");
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      const nextMap = Object.fromEntries(
        Object.entries(value).map(([uid, user]) => [uid, user?.displayName || user?.email || uid])
      );
      setUserMap(nextMap);
    });

    return () => usersUnsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const reportsRef = dbRef(firebaseDatabase, "incidentReports");
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      const reportEntries = Object.entries(value).map(([id, item]) => {
        const timestamp = Number(item?.timestamp ?? Date.now());
        const createdAt = new Date(timestamp);
        const reporterName = userMap[item?.residentId] || item?.residentId || "Resident";

        return {
          id: `#INC-${String(id).slice(0, 8).toUpperCase()}`,
          type: item?.incidentType || "Others",
          desc: item?.description || "No description provided.",
          icon: "/incident-icons/landslide.png",
          iconBg: "bg-[#fff7ed] border border-[#ffedd5]",
          location: item?.location || "Unknown location",
          subLocation: item?.location || "Unknown location",
          reporter: reporterName,
          role: "Resident",
          date: createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
          status: item?.status || "Pending",
          statusStyle:
            item?.status === "Resolved"
              ? "bg-[#ecfdf5] text-[#059669]"
              : item?.status === "In Progress"
              ? "bg-[#eff6ff] text-[#2563eb]"
              : item?.status === "Dismissed"
              ? "bg-[#f3e8ff] text-[#9333ea]"
              : "bg-[#fff7ed] text-[#ea580c]",
        };
      });

      setReports(reportEntries);
    });

    return () => unsubscribe();
  }, [userMap]);

  useEffect(() => {
    if (!highlightedReportId) return;

    const timer = setTimeout(() => {
      const row = document.getElementById(`report-row-${highlightedReportId}`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [highlightedReportId]);

  const stats = [
    { label: "Total Reports", value: String(reports.length), sub: "All time", icon: FileText, color: "text-[#f43f5e]", bg: "bg-[#ffeef0]" },
    { label: "Pending", value: String(reports.filter((row) => row.status === "Pending").length), sub: "Awaiting review", icon: Hourglass, color: "text-[#f59e0b]", bg: "bg-[#fffbeb]" },
    { label: "In Progress", value: String(reports.filter((row) => row.status === "In Progress").length), sub: "Being addressed", icon: Eye, color: "text-[#3b82f6]", bg: "bg-[#eff6ff]" },
    { label: "Resolved", value: String(reports.filter((row) => row.status === "Resolved").length), sub: "Successfully closed", icon: CheckCircle2, color: "text-[#10b981]", bg: "bg-[#ecfdf5]" },
    { label: "Dismissed", value: String(reports.filter((row) => row.status === "Dismissed").length), sub: "Not a hazard", icon: XCircle, color: "text-[#a855f7]", bg: "bg-[#f3e8ff]" },
  ];

  const filteredReports = reports.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        row.id,
        row.type,
        row.desc,
        row.location,
        row.subLocation,
        row.reporter,
        row.role,
      ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "All Status" || row.status === statusFilter;
    const matchesType = typeFilter === "All Incident Types" || row.type === typeFilter;
    const matchesLocation =
      locationFilter === "All Locations" || row.location.includes(locationFilter) || row.subLocation.includes(locationFilter);

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">
        {stats.map((s) => {
          const IconComp = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3.5 rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-[0_2px_8px_rgba(20,61,42,0.03)]"
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${s.bg} ${s.color}`}>
                <IconComp size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold tracking-tight text-[#1e293b]">{s.value}</div>
                <div className="text-xs font-bold text-[#475569]">{s.label}</div>
                <div className="text-[10px] text-[#94a3b8]">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ed] pb-5">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-[#dfe6e1] bg-white px-3.5 py-2 text-[#8b9690] shadow-sm">
            <Search size={16} className="text-[#64748b]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-[#94a3b8]"
              placeholder="Search reports..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Dismissed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
              <option>All Incident Types</option>
              <option>Landslide / Soil Movement</option>
              <option>Flooding</option>
              <option>Rockfall / Debris</option>
              <option>Crack on Ground</option>
              <option>Blocked Drainage</option>
              <option>Fallen Tree</option>
              <option>Others</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
              <option>All Locations</option>
              <option>Purok 1</option>
              <option>Purok 2</option>
              <option>Purok 3</option>
              <option>Purok 4</option>
              <option>Purok 5</option>
              <option>Purok 6</option>
            </select>
            <button className="flex items-center gap-2 rounded-lg border border-[#dfe6e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] shadow-sm hover:bg-slate-50 transition">
              <CalendarDays size={15} className="text-[#475569]" /> May 20, 2025 - May 27, 2025
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e9e6] pb-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-[#64748b]">
                <th className="pb-3 pr-4 font-extrabold">Report ID</th>
                <th className="pb-3 pr-4 font-extrabold">Incident Type</th>
                <th className="pb-3 pr-4 font-extrabold">Location</th>
                <th className="pb-3 pr-4 font-extrabold">Reported By</th>
                <th className="pb-3 pr-4 font-extrabold">Date & Time</th>
                <th className="pb-3 pr-4 font-extrabold">Status</th>
                <th className="pb-3 text-right font-extrabold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3f1]">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#64748b]">
                    No matching incident reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((row) => (
                  <tr
                    id={`report-row-${row.id}`}
                    key={row.id}
                    onClick={() => setHighlightedReportId(row.id)}
                    className={`cursor-pointer transition ${highlightedReportId === row.id ? "bg-[#f3f4f6] ring-1 ring-[#cbd5e1]" : "hover:bg-[#f8faf8]"}`}
                  >
                    <td className="py-4 pr-4 font-extrabold text-[#006b37]">
                      {row.id}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${row.iconBg}`}>
                          {row.icon ? (
                            <img src={row.icon} alt={row.type} className="h-5 w-5 object-contain" />
                          ) : (
                            <row.lucideIcon size={18} className={row.lucideColor} />
                          )}
                        </span>
                        <div>
                          <div className="font-bold text-[#1e293b]">{row.type}</div>
                          <div className="text-[11px] text-[#64748b]">{row.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-[#1e293b]">{row.location}</div>
                      <div className="text-[11px] text-[#64748b]">{row.subLocation}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-semibold text-[#1e293b]">{row.reporter}</div>
                      <div className="text-[11px] text-[#64748b]">{row.role}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-[#334155]">{row.date}</div>
                      <div className="text-[11px] text-[#64748b]">{row.time}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold ${row.statusStyle}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="View details"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 transition"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          title="More options"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 transition"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0ed] pt-4 text-xs text-[#64748b]">
          <div>Showing 1 to 7 of 18 reports</div>
          <div className="flex items-center gap-1.5">
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">
              &lt;
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg bg-[#006b37] text-white font-bold shadow-sm">
              1
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">
              2
            </button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">
              3
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SafeAnnouncementsPage({ announcementFormOpen, setAnnouncementFormOpen }) {
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "Weather Advisory",
    priority: "High",
    status: "Published",
    scheduledAt: "",
  });
  const [titleSuggestionsOpen, setTitleSuggestionsOpen] = useState(false);
  const [savedTitles, setSavedTitles] = useState(() => {
    try {
      const stored = localStorage.getItem("slopeSenseAnnouncementTitles");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [softDeletedIds, setSoftDeletedIds] = useState(() => {
    try {
      const stored = localStorage.getItem("slopeSenseDeletedAnnouncements");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [menuAnnouncementId, setMenuAnnouncementId] = useState(null);
  const [announcementToArchive, setAnnouncementToArchive] = useState(null);
  const [announcementToRestore, setAnnouncementToRestore] = useState(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const messageEditorRef = useRef(null);

  const announcementTypeMeta = {
    "Weather Advisory": { icon: CloudRain, accent: "bg-[#fef2f2] text-[#ef4444]", defaultTitle: "Heavy Rainfall Advisory" },
    "Safety Reminder": { icon: Shield, accent: "bg-[#ecfdf5] text-[#059669]", defaultTitle: "Safety Reminder Notice" },
    "System Update": { icon: Settings, accent: "bg-[#eff6ff] text-[#2563eb]", defaultTitle: "System Update Notice" },
    Information: { icon: FileText, accent: "bg-[#fff7ed] text-[#ea580c]", defaultTitle: "Slope Safety Information" },
    Event: { icon: CalendarDays, accent: "bg-[#f5f3ff] text-[#7c3aed]", defaultTitle: "Community Safety Event" },
  };
  const selectedAnnouncementType = announcementTypeMeta[form.type] || announcementTypeMeta["Weather Advisory"];
  const SelectedAnnouncementIcon = selectedAnnouncementType.icon;

  useEffect(() => {
    try {
      localStorage.setItem("slopeSenseAnnouncementTitles", JSON.stringify(savedTitles));
    } catch {
      // ignore storage write failures
    }
  }, [savedTitles]);

  useEffect(() => {
    try {
      localStorage.setItem("slopeSenseDeletedAnnouncements", JSON.stringify(softDeletedIds));
    } catch {
      // ignore storage write failures
    }
  }, [softDeletedIds]);

  const saveTitleToHistory = useCallback((nextTitle) => {
    const cleanTitle = (nextTitle || "").trim();
    if (!cleanTitle) return;

    setSavedTitles((prev) => {
      const unique = prev.filter((item) => item.toLowerCase() !== cleanTitle.toLowerCase());
      return [cleanTitle, ...unique].slice(0, 12);
    });
  }, []);

  const removeTitleFromHistory = useCallback((titleToRemove) => {
    setSavedTitles((prev) => prev.filter((item) => item !== titleToRemove));
  }, []);

  const typeTitleSuggestions = useMemo(() => {
    const typeDefault = announcementTypeMeta[form.type]?.defaultTitle;
    const items = [
      ...(typeDefault ? [typeDefault] : []),
      ...savedTitles,
    ];

    const query = form.title.trim().toLowerCase();
    if (!query) return [...new Set(items)].slice(0, 6);

    return [...new Set(items.filter((item) => item.toLowerCase().includes(query)))].slice(0, 6);
  }, [form.type, form.title, savedTitles]);

  const handleTypeChange = useCallback((nextType) => {
    const nextDefaultTitle = announcementTypeMeta[nextType]?.defaultTitle || "";
    setForm((prev) => ({
      ...prev,
      type: nextType,
      title: nextDefaultTitle,
    }));
    setTitleSuggestionsOpen(true);
  }, []);

  const stripRichTextToPlainText = useCallback((value = "") => {
    if (!value) return "";

    return value
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/?ol[^>]*>/gi, "\n")
      .replace(/<\/?ul[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p\s*>/gi, "\n")
      .replace(/<\/?div\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, []);

  const updateMessageEditorFromState = useCallback(() => {
    const editor = messageEditorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== (form.message || "")) {
      editor.innerHTML = form.message || "";
    }
  }, [form.message]);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const announcementsRef = dbRef(firebaseDatabase, "announcements");
    const unsubscribe = onValue(announcementsRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      const rows = Object.entries(value)
        .map(([id, item]) => ({
          id,
          title: item?.title || "Untitled announcement",
          desc: item?.description || item?.message || "No description provided.",
          plainDesc: stripRichTextToPlainText(item?.description || item?.message || "No description provided."),
          type: item?.type || "Information",
          priority: item?.priority || "Medium",
          status: item?.status || "Published",
          scheduledAt: item?.scheduledAt || null,
          publishedAt: item?.publishedAt || null,
          createdAt: Number(item?.createdAt || Date.now()),
        }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      setAnnouncements(rows);
    });

    return () => unsubscribe();
  }, []);

  const displayAnnouncements = announcements.map((row) => {
    const isArchived = row.status === "Archived";
    const isScheduled = row.status === "Scheduled" || (row.scheduledAt && Number(row.scheduledAt) > Date.now());
    const computedStatus = isArchived ? "Archived" : isScheduled ? "Scheduled" : "Published";
    const typeIcons = {
      "Weather Advisory": CloudRain,
      "Safety Reminder": Shield,
      "System Update": Settings,
      "Information": FileText,
      Event: CalendarDays,
    };
    const typeColors = {
      "Weather Advisory": "bg-[#ffeef0] text-[#ef4444] border border-[#fecdd3]",
      "Safety Reminder": "bg-[#ecfdf5] border border-[#a7f3d0]",
      "System Update": "bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]",
      Information: "bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]",
      Event: "bg-[#f3e8ff] text-[#9333ea] border border-[#e9d5ff]",
    };
    const iconMap = {
      "Weather Advisory": AlertTriangle,
      "Safety Reminder": Shield,
      "System Update": Info,
      Information: Mountain,
      Event: Calendar,
    };
    const priorityStyleMap = {
      High: "bg-[#ffeef0] text-[#ef4444]",
      Medium: "bg-[#fff7ed] text-[#ea580c]",
      Low: "bg-[#eff6ff] text-[#3b82f6]",
    };
    const statusStyleMap = {
      Published: "bg-[#ecfdf5] text-[#059669]",
      Scheduled: "bg-[#eff6ff] text-[#2563eb]",
      Archived: "bg-[#f1f5f9] text-[#64748b]",
    };

    return {
      ...row,
      icon: iconMap[row.type] || Megaphone,
      iconBg: typeColors[row.type] || "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]",
      typeIcon: typeIcons[row.type] || Megaphone,
      priorityStyle: priorityStyleMap[row.priority] || priorityStyleMap.Medium,
      status: computedStatus,
      statusStyle: statusStyleMap[computedStatus] || statusStyleMap.Published,
      date: row.scheduledAt && computedStatus === "Scheduled"
        ? new Date(Number(row.scheduledAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : row.publishedAt
          ? new Date(Number(row.publishedAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : new Date(Number(row.createdAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: row.scheduledAt && computedStatus === "Scheduled"
        ? new Date(Number(row.scheduledAt)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : row.publishedAt
          ? new Date(Number(row.publishedAt)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : new Date(Number(row.createdAt)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  });

  const visibleAnnouncements = displayAnnouncements.filter((row) => !softDeletedIds.includes(row.id));

  useEffect(() => {
    if (announcementFormOpen) {
      updateMessageEditorFromState();
    }
  }, [announcementFormOpen]);

  const stats = [
    { label: "Total Announcements", value: String(visibleAnnouncements.length), sub: "All time", icon: Megaphone, color: "text-[#10b981]", bg: "bg-[#ecfdf5]" },
    { label: "Published", value: String(visibleAnnouncements.filter((row) => row.status === "Published").length), sub: "Active and visible", icon: Send, color: "text-[#2563eb]", bg: "bg-[#eff6ff]" },
    { label: "Scheduled", value: String(visibleAnnouncements.filter((row) => row.status === "Scheduled").length), sub: "To be published", icon: Clock, color: "text-[#d97706]", bg: "bg-[#fffbeb]" },
    { label: "Archived", value: String(visibleAnnouncements.filter((row) => row.status === "Archived").length), sub: "No longer visible", icon: Archive, color: "text-[#9333ea]", bg: "bg-[#f3e8ff]" },
  ];

  const filteredAnnouncements = visibleAnnouncements.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [row.title, row.desc, row.type, row.priority, row.status].some((value) =>
        value.toLowerCase().includes(query)
      );

    const matchesStatus = statusFilter === "All Status" || row.status === statusFilter;
    const matchesType = typeFilter === "All Types" || row.type === typeFilter;
    const matchesPriority = priorityFilter === "All Priority" || row.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const handleSoftDelete = useCallback((announcementId) => {
    setSoftDeletedIds((prev) => (prev.includes(announcementId) ? prev : [...prev, announcementId]));
    setMenuAnnouncementId(null);
    setAnnouncementToDelete(null);
    toast.success("Announcement hidden from the app view.", {
      description: "The original Firebase post remains intact.",
    });
  }, []);

  const handleArchiveAnnouncement = useCallback(async (announcement) => {
    if (!announcement || !firebaseDatabase) {
      toast.error("Database is not configured.");
      return;
    }

    try {
      const payload = {
        title: announcement.title,
        description: announcement.desc || announcement.description || announcement.message || "",
        type: announcement.type,
        priority: announcement.priority,
        status: "Archived",
        createdAt: Number(announcement.createdAt || Date.now()),
        publishedAt: announcement.publishedAt ?? null,
        scheduledAt: announcement.scheduledAt ?? null,
        archivedAt: Date.now(),
      };

      await set(dbRef(firebaseDatabase, `announcements/${announcement.id}`), payload);

      setMenuAnnouncementId(null);
      setAnnouncementToArchive(null);
      toast.success("Announcement archived.", {
        description: "It is hidden from the resident app until restored.",
      });
    } catch (error) {
      toast.error("Unable to archive announcement.", {
        description: error?.message || "Please try again.",
      });
    }
  }, []);

  const handleRestoreAnnouncement = useCallback(async (announcement) => {
    if (!announcement || !firebaseDatabase) {
      toast.error("Database is not configured.");
      return;
    }

    try {
      const nextStatus = announcement.scheduledAt && Number(announcement.scheduledAt) > Date.now() ? "Scheduled" : "Published";
      const payload = {
        title: announcement.title,
        description: announcement.desc || announcement.description || announcement.message || "",
        type: announcement.type,
        priority: announcement.priority,
        status: nextStatus,
        createdAt: Number(announcement.createdAt || Date.now()),
        publishedAt: nextStatus === "Published" ? Number(announcement.publishedAt || Date.now()) : null,
        scheduledAt: nextStatus === "Scheduled" ? Number(announcement.scheduledAt || Date.now()) : null,
        archivedAt: null,
      };

      await set(dbRef(firebaseDatabase, `announcements/${announcement.id}`), payload);

      setMenuAnnouncementId(null);
      setAnnouncementToRestore(null);
      toast.success("Announcement restored.", {
        description: "It is active again and visible to residents.",
      });
    } catch (error) {
      toast.error("Unable to restore announcement.", {
        description: error?.message || "Please try again.",
      });
    }
  }, []);

  const normalizePastedAnnouncementText = useCallback((rawText = "") => {
    if (!rawText) return "";

    const withHtmlDecoded = rawText
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

    const withoutHtmlTags = withHtmlDecoded
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?p\s*>/gi, "\n")
      .replace(/<\/?div\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/?ul\s*>|<\/?ol\s*>/gi, "\n")
      .replace(/<\/?(b|strong|u|i|em|span|font|h[1-6]|blockquote)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .trim();

    return withoutHtmlTags;
  }, []);

  const handleAnnouncementMessagePaste = useCallback((event) => {
    const clipboardText = event.clipboardData.getData("text/plain");
    const clipboardHtml = event.clipboardData.getData("text/html");
    const pastedValue = normalizePastedAnnouncementText(clipboardHtml || clipboardText || "");

    if (!pastedValue) return;

    event.preventDefault();
    const editor = messageEditorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(pastedValue);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.focus();
      document.execCommand("insertText", false, pastedValue);
    }

    setForm((prev) => ({ ...prev, message: editor.innerHTML }));
  }, [normalizePastedAnnouncementText]);

  const savedEditorSelectionRef = useRef(null);

  const saveEditorSelection = useCallback(() => {
    const editor = messageEditorRef.current;
    if (!editor) return;

    const selection = window.getSelection && window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      savedEditorSelectionRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
      savedEditorSelectionRef.current = range.cloneRange();
    } else {
      savedEditorSelectionRef.current = null;
    }
  }, []);

  const restoreEditorSelection = useCallback(() => {
    const editor = messageEditorRef.current;
    if (!editor) return;

    const selection = window.getSelection && window.getSelection();
    const savedRange = savedEditorSelectionRef.current;

    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange.cloneRange());
    }

    editor.focus();
  }, []);

  const syncEditorMessage = useCallback((sourceHtml) => {
    const editor = messageEditorRef.current;
    if (!editor) return;

    const html = sourceHtml ?? editor.innerHTML ?? "";
    setForm((prev) => ({ ...prev, message: html }));
  }, []);

  const placeCaretAtElement = useCallback((element) => {
    const editor = messageEditorRef.current;
    if (!editor || !element) return;

    const selection = window.getSelection && window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  }, []);

  const handleEditorKeyDown = useCallback((event) => {
    if (event.key !== "Enter") return;

    const editor = messageEditorRef.current;
    if (!editor) return;

    const selection = window.getSelection && window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      syncEditorMessage(editor.innerHTML ?? "");
      return;
    }

    const range = selection.getRangeAt(0);
    const currentListItem = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer.closest("li")
      : range.startContainer.parentElement?.closest("li");

    if (!currentListItem) {
      return;
    }

    const list = currentListItem.parentElement;
    if (!list || !["UL", "OL"].includes(list.tagName)) {
      return;
    }

    const isEmpty = currentListItem.textContent.trim().length === 0;
    if (isEmpty) {
      event.preventDefault();
      const exitCmd = list.tagName === "UL" ? "insertUnorderedList" : "insertOrderedList";
      try {
        document.execCommand(exitCmd, false, null);
      } catch {
        // Ignore unsupported command.
      }
      syncEditorMessage(editor.innerHTML ?? "");
    }
  }, [syncEditorMessage]);

  const applyMessageCommand = useCallback((command) => {
    const editor = messageEditorRef.current;
    if (!editor) return;

    restoreEditorSelection();

    try {
      if (typeof document !== "undefined" && typeof document.execCommand === "function") {
        document.execCommand(command, false, null);
      }
    } catch {
      // Ignore unsupported native editor commands.
    }

    syncEditorMessage(editor.innerHTML ?? "");
  }, [restoreEditorSelection, syncEditorMessage]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.trim();
    const message = form.message.trim();

    if (!title || !message) {
      toast.error("Announcement title and message are required.");
      return;
    }

    if (form.status === "Scheduled" && !form.scheduledAt) {
      toast.error("Select a schedule date and time for scheduled announcements.");
      return;
    }

    if (!firebaseDatabase) {
      toast.error("Firebase is not configured.");
      return;
    }

    try {
      const timestamp = Date.now();
      const scheduledValue = form.status === "Scheduled" ? new Date(form.scheduledAt).getTime() : null;

      const announcementRef = push(dbRef(firebaseDatabase, "announcements"));
      const sanitizedMessage = message.trim();

      await set(announcementRef, {
        title,
        description: sanitizedMessage,
        type: form.type,
        priority: form.priority,
        status: form.status,
        createdAt: timestamp,
        publishedAt: form.status === "Published" ? timestamp : null,
        scheduledAt: scheduledValue,
      });

      toast.success("Announcement published", {
        description: form.status === "Scheduled" ? `Scheduled for ${new Date(scheduledValue).toLocaleString()}.` : "The announcement is now live.",
      });

      saveTitleToHistory(title);
      setForm({
        title: "",
        message: "",
        type: "Weather Advisory",
        priority: "High",
        status: "Published",
        scheduledAt: "",
      });
      setAnnouncementFormOpen(false);
    } catch (error) {
      toast.error("Unable to save announcement.", {
        description: error?.message || "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const IconComp = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3.5 rounded-xl border border-[#dfe7e1] bg-white p-4 shadow-[0_2px_8px_rgba(20,61,42,0.03)]">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${s.bg} ${s.color}`}>
                <IconComp size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold tracking-tight text-[#1e293b]">{s.value}</div>
                <div className="text-xs font-bold text-[#475569]">{s.label}</div>
                <div className="text-[10px] text-[#94a3b8]">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ed] pb-5">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-[#dfe6e1] bg-white px-3.5 py-2 text-[#8b9690] shadow-sm">
            <Search size={16} className="text-[#64748b]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs outline-none placeholder:text-[#94a3b8]"
              placeholder="Search announcements..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none">
              <option>All Status</option>
              <option>Published</option>
              <option>Scheduled</option>
              <option>Archived</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none">
              <option>All Types</option>
              <option>Weather Advisory</option>
              <option>Safety Reminder</option>
              <option>System Update</option>
              <option>Information</option>
              <option>Event</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="flex items-center gap-2 rounded-lg border border-[#dfe6e1] bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] shadow-sm hover:bg-slate-50 transition">
              <CalendarDays size={15} className="text-[#475569]" /> May 20, 2025 - May 27, 2025
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e9e6] pb-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-[#64748b]">
                <th className="pb-3 pr-4 font-extrabold">Announcement</th>
                <th className="pb-3 pr-4 font-extrabold">Type</th>
                <th className="pb-3 pr-4 font-extrabold">Priority</th>
                <th className="pb-3 pr-4 font-extrabold">Status</th>
                <th className="pb-3 pr-4 font-extrabold">Published / Scheduled</th>
                <th className="pb-3 text-right font-extrabold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3f1]">
              {filteredAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[#64748b]">
                    No matching safety announcements found.
                  </td>
                </tr>
              ) : (
                filteredAnnouncements.map((row, idx) => {
                  const IconComponent = row.icon;
                  const TypeIconComponent = row.typeIcon;
                  const isMenuOpen = menuAnnouncementId === row.id;
                  return (
                    <tr key={row.id || idx} className="hover:bg-[#f8faf8] transition">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3 max-w-[420px]">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${row.iconBg}`}>
                            <IconComponent size={18} />
                          </span>
                          <div>
                            <div className="font-bold text-[#1e293b]">{row.title}</div>
                            <div className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed">{row.plainDesc || row.desc}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[#334155] font-medium">
                          <TypeIconComponent size={15} className="text-[#64748b]" />
                          <span>{row.type}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold ${row.priorityStyle}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold ${row.statusStyle}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <div className="text-[#334155]">{row.date}</div>
                        <div className="text-[11px] text-[#64748b]">{row.time}</div>
                      </td>
                      <td className="py-4 text-right whitespace-nowrap">
                        <div className="relative flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setSelectedAnnouncement(row)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 transition"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            title="More options"
                            onClick={() => setMenuAnnouncementId(isMenuOpen ? null : row.id)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 transition"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-[#dfe7e1] bg-white p-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
                              {row.status === "Archived" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnnouncementToRestore(row);
                                    setMenuAnnouncementId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[#1f2937] hover:bg-[#f8fafc]"
                                >
                                  <Archive size={14} /> Restore
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnnouncementToArchive(row);
                                    setMenuAnnouncementId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[#1f2937] hover:bg-[#f8fafc]"
                                >
                                  <Archive size={14} /> Archive
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setAnnouncementToDelete(row);
                                  setMenuAnnouncementId(null);
                                }}
                                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[#dc2626] hover:bg-[#fff1f2]"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0ed] pt-4 text-xs text-[#64748b]">
          <div>Showing 1 to {Math.min(filteredAnnouncements.length, 6)} of {displayAnnouncements.length} announcements</div>
          <div className="flex items-center gap-1.5">
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">&lt;</button>
            <button className="grid h-8 w-8 place-items-center rounded-lg bg-[#006b37] text-white font-bold shadow-sm">1</button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">2</button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">3</button>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">&gt;</button>
          </div>
        </div>
      </section>

      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#edf0ed] pb-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${announcementTypeMeta[selectedAnnouncement.type]?.accent || "bg-[#f1f5f9] text-[#64748b]"}`}>
                  {(() => {
                    const Icon = announcementTypeMeta[selectedAnnouncement.type]?.icon || Megaphone;
                    return <Icon size={20} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#111827]">{selectedAnnouncement.title}</h3>
                  <p className="text-xs text-[#64748b]">{selectedAnnouncement.type}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedAnnouncement(null)} className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#334155]">
              <div className="rounded-xl border border-[#dfe7e1] bg-[#f8fafc] p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Announcement</div>
                <div
                  className="mt-2 whitespace-pre-wrap leading-6 text-[#1f2937] rich-text-content"
                  dangerouslySetInnerHTML={{ __html: selectedAnnouncement.desc || "" }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Priority</div>
                  <div className="mt-2 inline-block rounded-md px-2.5 py-1 text-[11px] font-bold bg-[#ffeef0] text-[#ef4444]">{selectedAnnouncement.priority}</div>
                </div>
                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Status</div>
                  <div className="mt-2 inline-block rounded-md px-2.5 py-1 text-[11px] font-bold bg-[#ecfdf5] text-[#059669]">{selectedAnnouncement.status}</div>
                </div>
                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Published</div>
                  <div className="mt-2 text-[#1f2937]">{selectedAnnouncement.date} · {selectedAnnouncement.time}</div>
                </div>
                <div className="rounded-xl border border-[#dfe7e1] p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#64748b]">Type</div>
                  <div className="mt-2 text-[#1f2937]">{selectedAnnouncement.type}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedAnnouncement(null)} className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementToArchive && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f0fdf4] text-[#15803d]">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">Archive announcement?</h3>
                <p className="text-xs text-[#64748b]">This will move it to the archived status.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#dcefe0] bg-[#f7fff9] p-3 text-sm text-[#334155]">
              <div className="font-bold text-[#111827]">{announcementToArchive.title}</div>
              <div className="mt-1 text-xs text-[#64748b]">It will remain in Firebase but will no longer be active.</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAnnouncementToArchive(null)} className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={() => handleArchiveAnnouncement(announcementToArchive)} className="rounded-lg bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#166534] transition">
                Yes, archive
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementToRestore && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#ecfdf5] text-[#15803d]">
                <Archive size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">Restore announcement?</h3>
                <p className="text-xs text-[#64748b]">This will make it active again for residents.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#d7f5df] bg-[#f5fff7] p-3 text-sm text-[#334155]">
              <div className="font-bold text-[#111827]">{announcementToRestore.title}</div>
              <div className="mt-1 text-xs text-[#64748b]">It will become visible in the resident-facing app again.</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAnnouncementToRestore(null)} className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={() => handleRestoreAnnouncement(announcementToRestore)} className="rounded-lg bg-[#15803d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#166534] transition">
                Yes, restore
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#fff1f2] text-[#dc2626]">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#111827]">Delete announcement?</h3>
                <p className="text-xs text-[#64748b]">This will hide it from the app only.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#f3dada] bg-[#fff7f7] p-3 text-sm text-[#334155]">
              <div className="font-bold text-[#111827]">{announcementToDelete.title}</div>
              <div className="mt-1 text-xs text-[#64748b]">Original Firebase record remains unchanged.</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAnnouncementToDelete(null)} className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={() => handleSoftDelete(announcementToDelete.id)} className="rounded-lg bg-[#dc2626] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#b91c1c] transition">
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {announcementFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            <div className="mb-5 flex items-center justify-between border-b border-[#edf0ed] pb-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${selectedAnnouncementType.accent}`}>
                  <SelectedAnnouncementIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#111827]">New Announcement</h3>
                  <p className="text-xs text-[#64748b]">Publish now or schedule for later.</p>
                </div>
              </div>
              <button type="button" onClick={() => setAnnouncementFormOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[#334155] flex items-center gap-2">
                  <Megaphone size={14} className="text-[#006b37]" />
                  Announcement
                </label>

                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#dfe6e1] bg-[#f8fafc] p-2">
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); saveEditorSelection(); }} onClick={() => applyMessageCommand("bold")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe6e1] bg-white text-sm font-bold text-[#1e293b] hover:bg-slate-50">B</button>
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); saveEditorSelection(); }} onClick={() => applyMessageCommand("italic")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe6e1] bg-white text-sm italic text-[#1e293b] hover:bg-slate-50">I</button>
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); saveEditorSelection(); }} onClick={() => applyMessageCommand("insertUnorderedList")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe6e1] bg-white text-base text-[#1e293b] hover:bg-slate-50">•</button>
                  <button type="button" onMouseDown={(event) => { event.preventDefault(); saveEditorSelection(); }} onClick={() => applyMessageCommand("insertOrderedList")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dfe6e1] bg-white text-base text-[#1e293b] hover:bg-slate-50">1.</button>
                </div>

                <div
                  ref={messageEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => {
                    const html = event.currentTarget?.innerHTML ?? "";
                    setForm((prev) => ({ ...prev, message: html }));
                  }}
                  onKeyDown={handleEditorKeyDown}
                  onPaste={handleAnnouncementMessagePaste}
                  className="min-h-[180px] w-full rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#006b37]"
                  style={{ resize: "vertical", whiteSpace: "pre-wrap", overflowWrap: "break-word", listStylePosition: "inside", paddingLeft: "0.75rem" }}
                  data-placeholder="Write the announcement message..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold text-[#334155] relative">
                  Title
                  <div className="relative mt-1.5">
                    <input
                      value={form.title}
                      onFocus={() => setTitleSuggestionsOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setTitleSuggestionsOpen(false), 120);
                        saveTitleToHistory(form.title);
                      }}
                      onChange={(event) => {
                        setForm((prev) => ({ ...prev, title: event.target.value }));
                        setTitleSuggestionsOpen(true);
                      }}
                      className="w-full rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#006b37]"
                      placeholder="Heavy Rainfall Advisory"
                    />

                    {titleSuggestionsOpen && typeTitleSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-xl border border-[#dfe7e1] bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                        {typeTitleSuggestions.map((suggestion) => (
                          <div
                            key={suggestion}
                            className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-[#334155] hover:bg-[#f8fafc]"
                          >
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setForm((prev) => ({ ...prev, title: suggestion }));
                                saveTitleToHistory(suggestion);
                                setTitleSuggestionsOpen(false);
                              }}
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              <span className={`grid h-7 w-7 place-items-center rounded-md ${selectedAnnouncementType.accent}`}>
                                <SelectedAnnouncementIcon size={14} />
                              </span>
                              <span className="font-medium">{suggestion}</span>
                            </button>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => removeTitleFromHistory(suggestion)}
                              className="grid h-6 w-6 place-items-center rounded-md text-[#64748b] hover:bg-slate-100"
                              aria-label={`Remove ${suggestion}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </label>

                <label className="text-xs font-bold text-[#334155]">
                  Type
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus-within:border-[#006b37]">
                    <div className={`grid h-8 w-8 place-items-center rounded-lg ${selectedAnnouncementType.accent}`}>
                      <SelectedAnnouncementIcon size={16} />
                    </div>
                    <select
                      value={form.type}
                      onChange={(event) => handleTypeChange(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-[#1e293b] outline-none"
                    >
                      <option>Weather Advisory</option>
                      <option>Safety Reminder</option>
                      <option>System Update</option>
                      <option>Information</option>
                      <option>Event</option>
                    </select>
                  </div>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-xs font-bold text-[#334155]">
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#006b37]"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-[#334155]">
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#006b37]"
                  >
                    <option>Published</option>
                    <option>Scheduled</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-[#334155]">
                  Schedule
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                    disabled={form.status !== "Scheduled"}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe6e1] bg-white px-3 py-2.5 text-sm text-[#1e293b] outline-none focus:border-[#006b37] disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAnnouncementFormOpen(false)} className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-[#006b37] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#00522a] transition">
                  {form.status === "Scheduled" ? "Save Schedule" : "Publish Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPage({ kind }) {
  const config = kind === "incidents" ? { stats: [["Total Reports", "18", "blue"], ["Pending", "6", "amber"], ["In Progress", "9", "blue"], ["Resolved", "12", "green"]], rows: incidentRows, headers: ["Report ID", "Incident Type", "Location", "Reported By", "Date & Time", "Status", "Actions"] } : { stats: [["Total Announcements", "12", "green"], ["Published", "5", "blue"], ["Scheduled", "3", "amber"], ["Archived", "4", "purple"]], rows: announcementRows, headers: ["Announcement", "Type", "Priority", "Status", "Published / Scheduled", "Actions"] };
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">{config.stats.map(([label, value, tone]) => <MetricCard key={label} icon={tone === "red" ? AlertTriangle : tone === "amber" ? AlertTriangle : tone === "blue" ? Info : tone === "purple" ? ClipboardList : ShieldCheck} tone={tone} label={label} value={value} sub={kind === "incidents" ? "Community records" : "All time"} />)}</div><section className="rounded-xl border border-[#e4e8e5] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-1 items-center gap-2 rounded-lg border border-[#dfe6e1] px-3 py-2 text-[#8b9690]"><Search size={15} /><input className="w-full bg-transparent text-xs outline-none placeholder:text-[#aab2ad]" placeholder={`Search ${kind}...`} /></div><div className="flex gap-2"><select className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-[0.62rem] text-[#66766d]"><option>All Status</option><option>Pending</option><option>Resolved</option></select><button className="flex items-center gap-2 rounded-lg bg-[#087442] px-3 py-2 text-[0.62rem] font-bold text-white"><CalendarDays size={13} /> Date range</button></div></div><div className="mt-5 overflow-x-auto"><div className="grid min-w-[760px] gap-3 border-b border-[#e5e9e6] px-4 py-3 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-[#7c8881] grid-cols-[1.1fr_1.25fr_1fr_1fr_1.25fr_0.8fr_0.4fr]">{config.headers.map((header) => <span key={header}>{header}</span>)}</div>{config.rows.map((row) => <div key={row[0]} className="grid min-w-[760px] items-center gap-3 border-b border-[#f0f2f0] px-4 py-3 text-[0.63rem] text-[#5f6e65] grid-cols-[1.1fr_1.25fr_1fr_1fr_1.25fr_0.8fr_0.4fr]"><span className="font-extrabold text-[#3a4d42]">{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span><span className={`font-bold ${row[3] === "CRITICAL" || row[3] === "High" ? "text-[#d84955]" : row[3] === "WARNING" || row[3] === "Medium" ? "text-[#bd7b0a]" : "text-[#2a80c8]"}`}>{row[3]}</span><span><span className={`rounded-md px-2 py-1 text-[0.55rem] font-bold ${row[4] === "New" || row[4] === "Pending" ? "bg-[#fff1d6] text-[#b57709]" : row[4] === "Resolved" ? "bg-[#e3f5e9] text-[#22814c]" : "bg-[#e4efff] text-[#2874cf]"}`}>{row[4]}</span></span><span>{row[5]}</span><button className="grid h-7 w-7 place-items-center rounded-lg border border-[#e0e7e1] text-[#6d7c72] hover:bg-[#f2f8f3]"><Eye size={13} /></button></div>)}</div></section></div>;
}

function ProfilePage() { return <div className="max-w-2xl rounded-xl border border-[#e4e8e5] bg-white p-6"><div className="flex items-center gap-4 border-b border-[#edf0ed] pb-5"><div className="grid h-16 w-16 place-items-center rounded-full bg-[#e0f1e7] text-[#087442]"><UserRound size={28} /></div><div><h2 className="text-lg font-extrabold text-[#27352f]">BDRRMC Admin</h2><p className="text-xs text-[#7e8983]">Administrator · Barangay Malinao, Ormoc City</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#65746c]">Full name<input className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#087442]" value="BDRRMC Admin" readOnly /></label><label className="text-xs font-bold text-[#65746c]">Email address<input className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#087442]" value="admin@slopesense.demo" readOnly /></label></div><button className="mt-6 rounded-lg bg-[#087442] px-4 py-2.5 text-xs font-bold text-white">Save changes</button></div>; }

function ReferenceProfilePage({ profile, setProfile, preferences, setPreferences }) {
  const [isEditing, setIsEditing] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileFieldChange = (field) => (event) => {
    setProfile((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSaveProfile = () => {
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      setIsEditing(false);
      setProfile((previous) => ({ ...previous, lastLogin: previous.lastLogin }));
      toast.success("Profile updated", {
        description: "Your account details have been saved.",
      });
    }, 250);
  };

  const handleTogglePreference = (key) => {
    setPreferences((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handleSavePreferences = () => {
    setSavingPreferences(true);
    setTimeout(() => {
      setSavingPreferences(false);
      toast.success("Notification preferences saved", {
        description: "Your alert preferences were updated.",
      });
    }, 200);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const user = firebaseAuth?.currentUser;

    if (!user || !user.email) {
      toast.error("You must be signed in to change the password.");
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Complete all password fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);

      toast.success("Password updated", {
        description: "Your admin password has been changed successfully.",
      });

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordModalOpen(false);
    } catch (error) {
      const message =
        error?.code === "auth/wrong-password"
          ? "Your current password is incorrect."
          : error?.code === "auth/requires-recent-login"
            ? "Please sign in again before changing the password."
            : error?.message || "Unable to update the password.";

      toast.error("Password change failed", {
        description: message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)] md:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center gap-5 border-r border-[#edf0ed] pr-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#04783f] text-white shadow-sm">
            <UserRound size={44} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-[#1e293b]">{profile.fullName}</h2>
              <span className="rounded-md bg-[#e4f5e9] px-2.5 py-1 text-xs font-bold text-[#15803d]">{profile.role}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-[#64748b]">Barangay Disaster Risk Reduction and Management Committee</p>
            <div className="mt-3 space-y-1 text-xs font-semibold text-[#475569]">
              <div>{profile.email}</div>
              <div>{profile.phone}</div>
            </div>
          </div>
        </div>
        <div className="relative pt-1">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="absolute right-0 top-0 rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-bold text-[#334155] shadow-sm hover:bg-slate-50 transition"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
          <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 pr-28 text-xs">
            <dt className="font-medium text-[#64748b]">Account ID</dt>
            <dd className="font-bold text-[#1e293b]">BDRRMC-ADMIN-001</dd>
            <dt className="font-medium text-[#64748b]">Role</dt>
            <dd className="font-bold text-[#1e293b]">{profile.role}</dd>
            <dt className="font-medium text-[#64748b]">Office / Position</dt>
            <dd className="font-bold text-[#1e293b]">{profile.office}</dd>
            <dt className="font-medium text-[#64748b]">Barangay</dt>
            <dd className="font-bold text-[#1e293b]">{profile.barangay}</dd>
            <dt className="font-medium text-[#64748b]">Municipality / City</dt>
            <dd className="font-bold text-[#1e293b]">{profile.city}</dd>
            <dt className="font-medium text-[#64748b]">Member Since</dt>
            <dd className="font-bold text-[#1e293b]">{profile.memberSince}</dd>
            <dt className="font-medium text-[#64748b]">Last Login</dt>
            <dd className="font-bold text-[#1e293b]">{profile.lastLogin}</dd>
          </dl>
        </div>
      </section>

      {isEditing && (
        <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
          <div className="mb-4 border-b border-[#edf0ed] pb-3.5">
            <h3 className="text-base font-extrabold text-[#15803d]">Edit Profile</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-[#65746c]">
              Full name
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.fullName}
                onChange={handleProfileFieldChange("fullName")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Email address
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.email}
                onChange={handleProfileFieldChange("email")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Phone number
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.phone}
                onChange={handleProfileFieldChange("phone")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Role
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.role}
                onChange={handleProfileFieldChange("role")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Office / Position
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.office}
                onChange={handleProfileFieldChange("office")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Barangay
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.barangay}
                onChange={handleProfileFieldChange("barangay")}
              />
            </label>
            <label className="text-xs font-bold text-[#65746c]">
              Municipality / City
              <input
                className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                value={profile.city}
                onChange={handleProfileFieldChange("city")}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="rounded-lg bg-[#087442] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#065e35] transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
            <div className="mb-4 border-b border-[#edf0ed] pb-3.5">
              <h3 className="text-base font-extrabold text-[#15803d]">Account Security</h3>
              <p className="mt-1 text-xs text-[#64748b]">Update your password and manage account security.</p>
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <span className="font-bold text-[#334155]">Password</span>
                <span className="font-mono text-[#64748b]">••••••••</span>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="rounded-lg border border-[#dfe7e1] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition"
                >
                  Change Password
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <div>
                  <span className="block font-bold text-[#334155]">Two-Factor Authentication</span>
                  <span className="text-[11px] text-[#64748b]">Add an extra layer of security</span>
                </div>
                <span className="rounded-md bg-[#e4f5e9] px-2.5 py-1 text-xs font-bold text-[#15803d]">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-bold text-[#334155]">Active Sessions</span>
                  <span className="text-[11px] text-[#64748b]">Manage your active sessions</span>
                </div>
                <button className="rounded-lg border border-[#dfe7e1] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] hover:bg-slate-50 transition">
                  Manage Sessions
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
            <h3 className="text-base font-extrabold text-[#15803d]">Recent Account Activity</h3>
            <p className="mt-1 text-xs text-[#64748b]">Your recent login activity and account actions.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5e9e6] pb-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-[#64748b]">
                    <th className="pb-2.5 pr-3 font-extrabold">Date & Time</th>
                    <th className="pb-2.5 pr-3 font-extrabold">Activity</th>
                    <th className="pb-2.5 pr-3 font-extrabold">Details</th>
                    <th className="pb-2.5 font-extrabold">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {[
                    ["May 27, 2025 10:42 AM", "Login", "Successful login", "192.168.1.10"],
                    ["May 27, 2025 09:15 AM", "Viewed Reports", "Incident list viewed", "192.168.1.10"],
                    ["May 26, 2025 04:30 PM", "Created Announcement", "Heavy Rainfall Advisory", "192.168.1.12"],
                    ["May 26, 2025 02:10 PM", "Updated Profile", "Profile information updated", "192.168.1.12"],
                  ].map((row) => (
                    <tr key={row[0]} className="text-xs text-[#475569]">
                      <td className="py-2.5 pr-3 whitespace-nowrap">{row[0]}</td>
                      <td className="py-2.5 pr-3 font-bold text-[#15803d] whitespace-nowrap">{row[1]}</td>
                      <td className="py-2.5 pr-3">{row[2]}</td>
                      <td className="py-2.5 font-mono text-[11px] text-[#64748b]">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#087442] hover:underline">
              View Full Activity Log <ChevronRight size={14} />
            </button>
          </section>
        </div>

        <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#15803d]">Notification Preferences</h3>
            <p className="mt-1 text-xs text-[#64748b]">Choose how you want to receive notifications.</p>
            <div className="mt-5 space-y-4">
              {[
                ["System Alerts", "Critical alerts from the slope monitoring system", "systemAlerts"],
                ["Incident Updates", "Updates on incident reports and their status", "incidentUpdates"],
                ["Safety Announcements", "New safety announcements and advisories", "safetyAnnouncements"],
                ["System Maintenance", "Notifications about system maintenance", "systemMaintenance"],
                ["Weekly Reports", "Receive weekly summary reports", "weeklyReports"],
              ].map(([name, detail, key]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-xs font-extrabold text-[#1e293b]">{name}</div>
                    <div className="mt-0.5 text-[11px] text-[#64748b]">{detail}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePreference(key)}
                    aria-label={`Toggle ${name}`}
                    className={`relative h-5 w-10 shrink-0 cursor-pointer rounded-full transition ${preferences[key] ? "bg-[#087442]" : "bg-[#cbd5e1]"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all shadow-sm ${preferences[key] ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className="mt-8 rounded-lg bg-[#087442] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#065e35] transition self-start disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingPreferences ? "Saving..." : "Save Preferences"}
          </button>
        </section>
      </div>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-change-title"
            className="w-full max-w-md rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_20px_50px_rgba(20,61,42,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="password-change-title" className="text-lg font-extrabold text-[#1e293b]">Change Password</h2>
                <p className="mt-1 text-xs text-[#64748b]">Update your admin password securely.</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-lg border border-[#dfe7e1] bg-white px-2 py-1 text-xs font-bold text-[#334155] hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-[#334155]">
                Current password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((previous) => ({ ...previous, currentPassword: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                />
              </label>
              <label className="block text-xs font-bold text-[#334155]">
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                />
              </label>
              <label className="block text-xs font-bold text-[#334155]">
                Confirm new password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-[#dce4df] px-3 py-2.5 text-sm font-normal text-[#1e293b] outline-none focus:border-[#087442]"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2 text-xs font-bold text-[#334155] hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#087442] px-4 py-2 text-xs font-bold text-white hover:bg-[#065e35] transition"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen, onLogout }) {
  const items = [
    ["dashboard", HomeIcon, "Dashboard"],
    ["sensors", Activity, "Sensor Monitoring"],
    ["alerts", Bell, "Alerts"],
    ["incidents", FileText, "Incident Reports"],
    ["announcements", Megaphone, "Safety Announcements"],
    ["profile", UserRound, "Profile"],
  ];
  return (
    <>
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex sidebar-terrain w-64 flex-col transition-transform duration-200 md:sticky md:top-0 md:h-screen md:self-start ${
          open ? "translate-x-0 md:flex" : "-translate-x-full md:hidden"
        }`}
      >
        <div className="app-sidebar-brand flex h-[76px] shrink-0 items-center px-6">
          <Logo small />
          <button
            onClick={() => setOpen(false)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[#7c8a81] md:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <nav className="app-sidebar-nav space-y-2" aria-label="Main navigation">
            {items.map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`app-nav-item flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  page === id
                    ? "app-nav-item-active"
                    : "text-[#24352d] hover:border-[#b9d8c5] hover:bg-[#edf7f0] hover:text-[#006b37]"
                }`}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={2.2} />
                {label}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="app-nav-item flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#24352d] transition hover:border-[#fecaca] hover:bg-[#fef2f2] hover:text-[#dc2626]"
            >
              <LogOut size={20} strokeWidth={2.2} />
              Logout
            </button>
          </nav>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-[#143a28]/25 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}

function ResetPasswordAction({ onBackToLogin }) {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") || "";
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Validating your password reset link...");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!firebaseAuth || mode !== "resetPassword" || !oobCode) {
      setStatus("invalid");
      setMessage("This password reset link is incomplete or invalid.");
      return undefined;
    }

    verifyPasswordResetCode(firebaseAuth, oobCode)
      .then((accountEmail) => {
        if (!active) return;
        setEmail(accountEmail);
        setStatus("ready");
        setMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setStatus("invalid");
        setMessage(error?.code === "auth/expired-action-code" ? "This password reset link has expired. Request a new link from the login page." : "This password reset link is invalid or has already been used.");
      });

    return () => { active = false; };
  }, [mode, oobCode]);

  const handleReset = async (event) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setMessage("Use a password with at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("The new passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");
      await confirmPasswordReset(firebaseAuth, oobCode, newPassword);
      setStatus("success");
      setMessage("Your password has been changed successfully. You can now sign in with the new password.");
      localStorage.removeItem("slopesense-remember-password");
    } catch (error) {
      setMessage(error?.code === "auth/expired-action-code" ? "This password reset link has expired. Request a new link." : error?.message || "Unable to change the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-reference-scene grid min-h-screen place-items-center bg-white px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white/95 p-6 shadow-[0_20px_50px_rgba(0,107,55,0.08)] sm:p-8">
        <div className="text-center"><Logo small /><h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[#006b37]">Change Password</h1><p className="mt-2 text-sm text-[#64748b]">Create a new password for your SlopeSense account.</p></div>

        {status === "checking" && <div className="mt-7 rounded-xl border border-[#dfe7e1] bg-[#f6faf7] p-4 text-center text-sm text-[#526057]">{message}</div>}

        {status === "invalid" && (
          <div className="mt-7"><div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-sm leading-6 text-[#991b1b]">{message}</div><button onClick={onBackToLogin} className="mt-5 w-full rounded-xl bg-[#006b37] px-4 py-3 text-sm font-bold text-white hover:bg-[#00522a]">Back to Login</button></div>
        )}

        {status === "ready" && (
          <form onSubmit={handleReset} className="mt-7 space-y-4">
            <div className="rounded-lg bg-[#f6faf7] px-3 py-2.5 text-xs text-[#526057]">Resetting password for <span className="font-bold text-[#27352f]">{email}</span></div>
            <label className="block text-sm font-bold text-[#27352f]">New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cbd5e1] px-4 py-3 font-normal outline-none focus:border-[#006b37] focus:ring-2 focus:ring-[#006b37]/15" required /></label>
            <label className="block text-sm font-bold text-[#27352f]">Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cbd5e1] px-4 py-3 font-normal outline-none focus:border-[#006b37] focus:ring-2 focus:ring-[#006b37]/15" required /></label>
            {message && <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-xs text-[#9a3412]">{message}</div>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#006b37] px-4 py-3 text-sm font-bold text-white hover:bg-[#00522a] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Changing Password..." : "Change Password"}</button>
          </form>
        )}

        {status === "success" && (
          <div className="mt-7"><div className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] p-4 text-sm leading-6 text-[#166534]">{message}</div><button onClick={onBackToLogin} className="mt-5 w-full rounded-xl bg-[#006b37] px-4 py-3 text-sm font-bold text-white hover:bg-[#00522a]">Continue to Login</button></div>
        )}
      </section>
    </main>
  );
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState(() => localStorage.getItem("slopesense-remember-email") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!firebaseAuth) {
      toast.error("Firebase Auth is not configured", {
        description: "Add your Firebase credentials to the project .env file first.",
      });
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required", {
        description: "Please enter your account email address.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setEmailSent(true);
      toast.success("Reset link sent", {
        description: "A password reset email has been sent to your inbox.",
      });
    } catch (error) {
      const message =
        error?.code === "auth/user-not-found"
          ? "No account is registered with that email address."
          : error?.message || "Unable to send the reset email right now.";

      toast.error("Password reset failed", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-reference-scene min-h-screen bg-white">
      <section className="grid min-h-screen overflow-hidden lg:grid-cols-2">
        <div className="relative flex min-h-[260px] items-center justify-center px-6 py-10 lg:min-h-full">
          <div className="relative z-10 text-center max-w-md">
            <Logo stacked />
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className="h-px w-24 bg-[#cbd5e1]" />
              <ShieldCheck size={24} className="text-[#006b37] shrink-0" />
              <span className="h-px w-24 bg-[#cbd5e1]" />
            </div>
            <p className="mt-3.5 text-sm font-medium text-[#475569]">
              Monitoring Slopes. Protecting Communities.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center px-6 py-10 sm:px-8 lg:px-16">
          <form
            className="relative z-10 w-full max-w-[460px] rounded-2xl border border-[#dfe7e1] bg-white/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,107,55,0.06)] backdrop-blur-sm"
            onSubmit={handleSubmit}
          >
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#006b37] hover:underline"
            >
              <ArrowLeft size={16} />
              Back to login
            </button>

            <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#006b37]">
              Forgot Password?
            </h1>
            <p className="mt-2 text-center text-sm font-medium text-[#64748b]">
              We’ll send a reset link to your account email.
            </p>

            <div className="mt-8 space-y-5">
              <label className="block text-sm font-bold text-[#1e293b]">
                Email Address
                <span className="mt-2 flex h-12 items-center rounded-xl border border-[#cbd5e1] bg-white px-4 text-[#006b37] focus-within:border-[#006b37] focus-within:ring-2 focus-within:ring-[#006b37]/15 transition">
                  <Mail size={18} strokeWidth={2} className="shrink-0 text-[#006b37]" />
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-normal text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              {emailSent && (
                <div className="rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-3 py-2 text-sm text-[#065f46]">
                  Password reset instructions were sent. Please check your inbox and spam folder.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005c2e] text-base font-bold text-white shadow-md hover:bg-[#004724] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Mail size={18} />
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </div>

            <div className="mt-7 text-center text-xs font-medium text-[#64748b]">
              © 2026 SlopeSense. All rights reserved.
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function Login({ onEnter, onForgotPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem("slopesense-remember-email") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("slopesense-remember-password") || "");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("slopesense-remember-enabled") === "true");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem("slopesense-remember-email", email);
      localStorage.setItem("slopesense-remember-enabled", "true");
    } else {
      localStorage.removeItem("slopesense-remember-email");
      localStorage.removeItem("slopesense-remember-enabled");
    }
  }, [email, rememberMe]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!firebaseAuth) {
      toast.error("Firebase Auth is not configured", {
        description: "Add your Firebase credentials to the project .env file first.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);

      if (rememberMe) {
        localStorage.setItem("slopesense-remember-email", email.trim());
        localStorage.setItem("slopesense-remember-password", password);
        localStorage.setItem("slopesense-remember-enabled", "true");
      } else {
        localStorage.removeItem("slopesense-remember-email");
        localStorage.removeItem("slopesense-remember-password");
        localStorage.removeItem("slopesense-remember-enabled");
      }

      onEnter();
    } catch (error) {
      const message =
        error?.code === "auth/invalid-credential"
          ? "Invalid admin email or password."
          : error?.message || "Unable to sign in with Firebase.";

      toast.error("Admin login failed", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-reference-scene min-h-screen bg-white">
      <section className="grid min-h-screen overflow-hidden lg:grid-cols-2">
        <div className="relative flex min-h-[340px] items-center justify-center px-6 py-12 lg:min-h-full">
          <div className="relative z-10 text-center max-w-md">
            <Logo stacked />
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className="h-px w-24 bg-[#cbd5e1]" />
              <ShieldCheck size={24} className="text-[#006b37] shrink-0" />
              <span className="h-px w-24 bg-[#cbd5e1]" />
            </div>
            <p className="mt-3.5 text-sm font-medium text-[#475569]">
              Monitoring Slopes. Protecting Communities.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center px-6 py-12 lg:px-16">
          <form
            className="relative z-10 w-full max-w-[460px] rounded-2xl border border-[#dfe7e1] bg-white/95 p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,107,55,0.06)] backdrop-blur-sm"
            onSubmit={handleSubmit}
          >
            <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#006b37]">
              Welcome Back!
            </h1>
            <p className="mt-2 text-center text-sm font-medium text-[#64748b]">
              Sign in to your BDRRMC account
            </p>

            <div className="mt-8 space-y-5">
              <label className="block text-sm font-bold text-[#1e293b]">
                Email Address
                <span className="mt-2 flex h-12 items-center rounded-xl border border-[#cbd5e1] bg-white px-4 text-[#006b37] focus-within:border-[#006b37] focus-within:ring-2 focus-within:ring-[#006b37]/15 transition">
                  <Mail size={18} strokeWidth={2} className="shrink-0 text-[#006b37]" />
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-normal text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block text-sm font-bold text-[#1e293b]">
                Password
                <span className="mt-2 flex h-12 items-center rounded-xl border border-[#cbd5e1] bg-white px-4 text-[#006b37] focus-within:border-[#006b37] focus-within:ring-2 focus-within:ring-[#006b37]/15 transition">
                  <Lock size={18} strokeWidth={2} className="shrink-0 text-[#006b37]" />
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-normal text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] transition"
                  >
                    <Eye size={18} />
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-[#475569] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-[#cbd5e1] accent-[#006b37] cursor-pointer"
                  />
                  Remember me
                </label>
                <button type="button" onClick={onForgotPassword} className="font-bold text-[#006b37] hover:underline">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005c2e] text-base font-bold text-white shadow-md hover:bg-[#004724] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogIn size={19} />
                {isSubmitting ? "Signing in..." : "Log In"}
              </button>
            </div>

            <div className="mt-7 flex items-center gap-4 text-xs font-medium text-[#94a3b8]">
              <span className="h-px flex-1 bg-[#e2e8f0]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[#e2e8f0]" />
            </div>

            <div className="mt-6 text-center text-xs font-medium text-[#64748b]">
              © 2026 SlopeSense. All rights reserved.
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const defaultProfile = {
    fullName: "BDRRMC Admin",
    email: "fiftydollbro@gmail.com",
    phone: "0917 123 4567",
    role: "Administrator",
    office: "BDRRMC Administrator",
    barangay: "Malinao",
    city: "Ormoc City",
    memberSince: "May 12, 2025 08:15 AM",
    lastLogin: "May 27, 2025 10:42 AM",
  };

  const defaultPreferences = {
    systemAlerts: true,
    incidentUpdates: true,
    safetyAnnouncements: true,
    systemMaintenance: false,
    weeklyReports: false,
  };
  const LAST_SENSOR_ALERT_KEY = "slopesense-last-sensor-alert";

  const [page, setPage] = useState(() => {
    const actionParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/auth/action" || actionParams.get("mode") === "resetPassword") return "reset-password";
    if (localStorage.getItem("slopesense-explicit-logout") === "true") return "login";
    const requestedPage = window.location.hash.replace("#", "");
    return requestedPage && pageMeta[requestedPage] ? requestedPage : "dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false);
  const [markAllAlertsTrigger, setMarkAllAlertsTrigger] = useState(0);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("slopesense-profile");
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("slopesense-notifications");
      return saved ? JSON.parse(saved) : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [liveSensors, setLiveSensors] = useState({});
  const [liveNotificationCount, setLiveNotificationCount] = useState(0);
  const [sensorHistory, setSensorHistory] = useState({ soil: [], rain: [], tilt: [], vibration: [] });
  const [dashboardIncidentReports, setDashboardIncidentReports] = useState([]);
  const [highlightedReportId, setHighlightedReportId] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("slopesense-app-notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const getStoredLastSensorAlert = () => {
    try {
      return localStorage.getItem(LAST_SENSOR_ALERT_KEY) ?? null;
    } catch {
      return null;
    }
  };
  const lastAlertRef = useRef(getStoredLastSensorAlert());
  const previousIncidentIdsRef = useRef(new Set());

  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  const addNotification = useCallback((title, description, tone = "info", targetPage = "dashboard", reportId = null) => {
    const isDuplicate = notifications.some(
      (notification) =>
        notification.title === title &&
        notification.description === description &&
        notification.targetPage === targetPage &&
        notification.reportId === reportId
    );

    if (isDuplicate) {
      return;
    }

    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      title,
      description,
      tone,
      targetPage,
      reportId,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((previous) => [item, ...previous].slice(0, 25));

    if (tone === "success") {
      toast.success(title, { description });
    } else if (tone === "warning") {
      toast.warning(title, { description });
    } else if (tone === "error") {
      toast.error(title, { description });
    } else {
      toast.info(title, { description });
    }
  }, [notifications]);

  const handleNotificationRead = (id) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleLogout = async () => {
    try {
      if (firebaseAuth) await signOut(firebaseAuth);
      localStorage.setItem("slopesense-explicit-logout", "true");
      setNotificationPanelOpen(false);
      setLogoutConfirmOpen(false);
      setPage("login");
    } catch (error) {
      toast.error("Unable to log out", {
        description: error?.message || "The Firebase session could not be closed. Please try again.",
      });
    }
  };

  useEffect(() => {
    localStorage.setItem("slopesense-profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("slopesense-notifications", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem("slopesense-app-notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const sensorRef = dbRef(firebaseDatabase, "sensors");
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      const findLatestSensor = (preferredIds, sensorTypes) => {
        for (const id of preferredIds) {
          if (data[id]?.latest) return data[id].latest;
        }

        const matchingDevice = Object.values(data).find((device) =>
          sensorTypes.includes(String(device?.latest?.sensorType ?? "").toLowerCase())
        );
        return matchingDevice?.latest ?? {};
      };
      const soil = findLatestSensor(["soilSensor"], ["soilmoisture", "soil"]);
      const rain = findLatestSensor(["rainSensor", "slope-01"], ["rain"]);
      const tilt = findLatestSensor(["tiltSensor"], ["tilt"]);
      const vibration = findLatestSensor(["vibrationSensor"], ["vibration"]);

      if (![soil, rain, tilt, vibration].some((sensor) => Object.keys(sensor).length > 0)) {
        setLiveSensors({});
        setLiveNotificationCount(0);
        return;
      }

      const receivedAt = Date.now();
      const nextSensors = {
        soil: Object.keys(soil).length === 0 ? {} : {
          moisturePercent: Number(soil.moisturePercent ?? 0),
          rawValue: Number(soil.rawValue ?? 0),
          level: soil.level ?? "NORMAL",
          sensorType: soil.sensorType ?? "soilMoisture",
          updatedAt: Number(soil.updatedAt ?? soil.timestamp ?? 0),
          receivedAt,
        },
        rain: Object.keys(rain).length === 0 ? {} : {
          rawValue: Number(rain.rawValue ?? 0),
          level: rain.level ?? "DRY",
          updatedAt: Number(rain.updatedAt ?? rain.timestamp ?? 0),
          receivedAt,
        },
        tilt: Object.keys(tilt).length === 0 ? {} : {
          tiltDetected: getDetectionState(tilt, ["tiltDetected", "detected", "value", "level", "status"]),
          level: tilt.level ?? (getDetectionState(tilt, ["tiltDetected", "detected", "value", "level", "status"]) ? "TILT DETECTED" : "STABLE"),
          sensorType: tilt.sensorType ?? "tilt",
          tiltChange: Number(tilt.tiltChange ?? tilt.changeX ?? tilt.changeY ?? 0),
          updatedAt: Number(tilt.updatedAt ?? tilt.timestamp ?? 0),
          receivedAt,
        },
        vibration: Object.keys(vibration).length === 0 ? {} : {
          vibrationDetected: getDetectionState(vibration, ["vibrationDetected", "detected", "value", "level", "status"]),
          level: vibration.level ?? (getDetectionState(vibration, ["vibrationDetected", "detected", "value", "level", "status"]) ? "VIBRATION DETECTED" : "NORMAL"),
          sensorType: vibration.sensorType ?? "vibration",
          vibrationValue: Number(vibration.value ?? vibration.rawValue ?? 0),
          updatedAt: Number(vibration.updatedAt ?? vibration.timestamp ?? 0),
          receivedAt,
        },
      };

      setLiveSensors(nextSensors);

      const soilTriggered = Object.keys(nextSensors.soil).length > 0 && Number(nextSensors.soil.moisturePercent) >= 70;
      const rainTriggered = Object.keys(nextSensors.rain).length > 0 && (Number(nextSensors.rain.rawValue) > 0 || String(nextSensors.rain.level).toLowerCase() !== "dry");
      const tiltTriggered = Boolean(nextSensors.tilt.tiltDetected);
      const vibrationTriggered = Boolean(nextSensors.vibration.vibrationDetected);
      const alertCount = (soilTriggered ? 1 : 0) + (rainTriggered ? 1 : 0) + (tiltTriggered ? 1 : 0) + (vibrationTriggered ? 1 : 0);
      setLiveNotificationCount(alertCount);

      const alertMessage = [];
      if (soilTriggered) {
        alertMessage.push(`Soil moisture alert: ${nextSensors.soil.moisturePercent}%`);
      }
      if (rainTriggered) {
        alertMessage.push(`Rain sensor detected: ${nextSensors.rain.rawValue} ADC`);
      }
      if (tiltTriggered) {
        alertMessage.push("Tilt sensor detected movement");
      }
      if (vibrationTriggered) {
        alertMessage.push("Vibration sensor detected movement");
      }

      if (alertMessage.length > 0) {
        const message = alertMessage.join(" • ");
        if (lastAlertRef.current !== message) {
          lastAlertRef.current = message;
          try {
            localStorage.setItem(LAST_SENSOR_ALERT_KEY, message);
          } catch {
            // Ignore storage failures for guest/local-only state.
          }
          addNotification("Sensor notification", message, "warning", "alerts");
        }
      } else if (lastAlertRef.current) {
        lastAlertRef.current = null;
        try {
          localStorage.removeItem(LAST_SENSOR_ALERT_KEY);
        } catch {
          // Ignore storage failures for guest/local-only state.
        }
      }
    }, (error) => {
      console.error("Unable to read Firebase sensor data:", error);
      setLiveSensors({});
      setLiveNotificationCount(0);
      toast.error("Sensor connection unavailable", {
        description: "Firebase rejected the sensor data request. Check the deployed environment variables and Realtime Database read rules.",
      });
    });

    return () => unsubscribe();
  }, [addNotification]);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const historyRef = dbRef(firebaseDatabase, "sensorHistory");
    const unsubscribe = onValue(historyRef, (snapshot) => {
      setSensorHistory(normalizeSensorHistory(snapshot.val() ?? {}));
    }, (error) => {
      console.error("Unable to read Firebase sensor history:", error);
      setSensorHistory({ soil: [], rain: [], tilt: [], vibration: [] });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const usersRef = dbRef(firebaseDatabase, "users");
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      setUserMap(
        Object.fromEntries(Object.entries(value).map(([uid, user]) => [uid, user?.displayName || user?.email || uid]))
      );
    });

    return () => usersUnsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseDatabase) return;

    const reportsRef = dbRef(firebaseDatabase, "incidentReports");
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      const value = snapshot.val() ?? {};
      const reportIds = Object.keys(value);
      const dashboardReports = Object.entries(value)
        .map(([id, item]) => ({
          id,
          title: item?.incidentType || "Incident report",
          description: item?.description || "No description provided.",
          location: item?.location || "Location unavailable",
          status: item?.status || "Pending",
          timestamp: Number(item?.timestamp ?? 0),
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setDashboardIncidentReports(dashboardReports);
      const newReportIds = reportIds.filter((id) => !previousIncidentIdsRef.current.has(id));

      if (newReportIds.length > 0) {
        const title = newReportIds.length > 1 ? "New incident reports" : "New incident report";

        newReportIds.forEach((reportId) => {
          const item = value[reportId] ?? {};
          const type = item.incidentType || "Incident";
          const location = item.location || "Unknown location";
          const reporterName = item.residentId ? (userMap[item.residentId] || item.residentId) : "Resident";
          const compactDescription = `${type} • ${location} • ${reporterName}`;
          addNotification(title, compactDescription, "success", "incidents", `#INC-${String(reportId).slice(0, 8).toUpperCase()}`);
        });
      }

      previousIncidentIdsRef.current = new Set(reportIds);
    });

    return () => unsubscribe();
  }, [addNotification, userMap]);

  if (page === "reset-password") return <ResetPasswordAction onBackToLogin={() => { window.history.replaceState({}, "", "/"); setPage("login"); }} />;
  if (page === "login") return <Login onEnter={() => { localStorage.removeItem("slopesense-explicit-logout"); setPage("dashboard"); }} onForgotPassword={() => setPage("forgot-password")} />;
  if (page === "forgot-password") return <ForgotPassword onBack={() => setPage("login")} />;
  const [title, subtitle] = pageMeta[page];
  const sensorData = buildSensorData(liveSensors);
  const monitoringSensorData = buildMonitoringSensorData(liveSensors);
  const shouldShowAlertBadge = unreadNotifications > 0;
  const barangayLabel = profile.barangay
    ? /^barangay\b/i.test(profile.barangay.trim())
      ? profile.barangay.trim()
      : `Barangay ${profile.barangay.trim()}`
    : "Barangay location unavailable";
  const profileLocation = [barangayLabel, profile.city?.trim()].filter(Boolean).join(", ");
  const currentDateLabel = currentDateTime.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const currentTimeLabel = currentDateTime.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="min-h-screen bg-[#f7f9f7] text-[#27352f]">
      <div className="flex min-h-screen">
        <Sidebar
          page={page}
          setPage={setPage}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          onLogout={() => setLogoutConfirmOpen(true)}
        />
        <div className="min-w-0 flex-1">
          <header className="app-header sticky top-0 z-30 flex h-[76px] items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setSidebarOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-lg text-[#111827] hover:bg-[#f3f4f6] hover:text-[#087442] transition"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} strokeWidth={2.2} />
              </button>
              <div className="h-8 w-px bg-[#e5e7eb]" />
              <div className="flex items-center gap-3">
                <MapPin size={24} className="text-[#087442] shrink-0" strokeWidth={2.2} />
                <div className="leading-tight">
                  <div className="text-sm sm:text-base font-bold text-[#087442]">{profileLocation}</div>
                  <div className="text-xs text-[#64748b]">Slope Monitoring Station</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#334155] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <CalendarDays size={15} className="text-[#475569]" />
                  <time dateTime={currentDateTime.toISOString()}>{currentDateLabel}</time>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#334155] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <Clock size={15} className="text-[#475569]" />
                  <time dateTime={currentDateTime.toISOString()}>{currentTimeLabel}</time>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setNotificationPanelOpen((previous) => !previous)}
                  className="relative flex items-center justify-center p-2 text-[#0f172a] hover:text-[#087442] hover:bg-[#f1f5f9] rounded-full transition"
                  aria-label="Notifications"
                >
                  <Bell size={24} strokeWidth={2.2} className="text-[#0f172a]" />
                  {shouldShowAlertBadge && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {notificationPanelOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[360px] rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
                    <div className="mb-2 flex items-center justify-between border-b border-[#edf2f7] pb-2">
                      <div className="text-sm font-extrabold text-[#0f172a]">Notifications</div>
                      <button
                        type="button"
                        onClick={() => setNotifications((previous) => previous.map((item) => ({ ...item, read: true })))}
                        className="text-[11px] font-bold text-[#006b37]"
                      >
                        Mark all read
                      </button>
                    </div>

                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-2 py-6 text-center text-xs text-[#64748b]">No notifications yet.</div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              handleNotificationRead(notification.id);
                              if (notification.reportId) {
                                setHighlightedReportId(notification.reportId);
                                setPage(notification.targetPage || "incidents");
                                setNotificationPanelOpen(false);
                                setTimeout(() => {
                                  const row = document.getElementById(`report-row-${notification.reportId}`);
                                  if (row) {
                                    row.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }
                                }, 180);
                              } else {
                                setPage(notification.targetPage || "dashboard");
                                setNotificationPanelOpen(false);
                              }
                            }}
                            className={`w-full rounded-xl border p-2.5 text-left transition ${
                              notification.read
                                ? "border-[#edf2f7] bg-[#f8fafc] opacity-75"
                                : "border-[#dbeafe] bg-[#eff6ff] font-bold"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-extrabold text-[#0f172a]">{notification.title}</div>
                                <div className="mt-1 text-[11px] leading-relaxed text-[#475569]">{notification.description}</div>
                              </div>
                              {!notification.read && (
                                <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                              )}
                            </div>
                            <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                              {new Date(notification.createdAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-8 w-px bg-[#e5e7eb]" />
              <button
                onClick={() => setPage("profile")}
                className="flex items-center gap-3 text-left hover:opacity-85 transition"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f172a] text-white shadow-sm">
                  <UserRound size={20} />
                </span>
                <span className="hidden sm:block leading-tight">
                  <span className="block text-sm font-bold text-[#111827]">{profile.fullName || "BDRRMC Admin"}</span>
                  <span className="block text-xs text-[#64748b]">{profile.role || "Administrator"}</span>
                </span>
              </button>
            </div>
          </header>
          <main className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[calc(100vh-160px)]"
              >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#111827]">{title}</h1>
                    <p className="mt-1 text-xs text-[#64748b]">{subtitle}</p>
                  </div>
                  {page === "sensors" && (
                    <button
                      onClick={() => setAlertSettingsOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-bold text-[#1f2937] shadow-sm transition hover:border-[#b9d8c5] hover:bg-[#f3f8f4]"
                    >
                      <Settings size={15} className="text-[#087442]" />
                      Sensor Settings
                    </button>
                  )}
                  {page === "announcements" && (
                    <button
                      type="button"
                      onClick={() => setAnnouncementFormOpen(true)}
                      className="rounded-lg bg-[#087442] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#065e35] transition"
                    >
                      + New Announcement
                    </button>
                  )}
                </div>
                {page === "dashboard" && (
                  <DashboardOverview
                    setPage={setPage}
                    sensorData={sensorData}
                    activeAlertCount={liveNotificationCount}
                    liveAlerts={buildLiveAlertsFromSensors(liveSensors)}
                    incidentReports={dashboardIncidentReports}
                  />
                )}
                {page === "sensors" && (
                  <SensorsPage
                    monitoringSensorData={monitoringSensorData}
                    sensorHistory={sensorHistory}
                  />
                )}
                {page === "alerts" && (
                  <SimplifiedAlertsPage
                    liveSensors={liveSensors}
                    profile={profile}
                    setPage={setPage}
                  />
                )}
                {page === "incidents" && (
                  <IncidentReportsPage
                    highlightedReportId={highlightedReportId}
                    setHighlightedReportId={setHighlightedReportId}
                  />
                )}
                {page === "announcements" && (
                  <SafeAnnouncementsPage
                    announcementFormOpen={announcementFormOpen}
                    setAnnouncementFormOpen={setAnnouncementFormOpen}
                  />
                )}
                {page === "profile" && <ReferenceProfilePage profile={profile} setProfile={setProfile} preferences={preferences} setPreferences={setPreferences} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <SensorSettingsModal open={alertSettingsOpen} onClose={() => setAlertSettingsOpen(false)} />
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#143a28]/35 px-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_20px_50px_rgba(20,61,42,0.2)]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fff1d5] text-[#b87500]">
                <LogOut size={19} />
              </span>
              <div>
                <h2 id="logout-confirm-title" className="text-base font-extrabold text-[#1e293b]">Log out?</h2>
                <p className="mt-1 text-sm leading-5 text-[#64748b]">Are you sure you want to leave the dashboard?</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="rounded-lg border border-[#dfe7e1] bg-white px-4 py-2 text-xs font-bold text-[#334155] hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-[#dc2626] px-4 py-2 text-xs font-bold text-white hover:bg-[#b91c1c] transition"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
