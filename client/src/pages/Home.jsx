import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDown,
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
import { SectionPulseIcon } from "@/components/DashboardIcons";
import { firebaseAuth } from "@/lib/firebase";

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

const sensorData = [
  { id: "soil", name: "SOIL MOISTURE", code: "(Capacitive Sensor)", value: "72%", detail: "Moisture Level", state: "WARNING", tone: "green", trend: "Increasing", icon: Droplet },
  { id: "rain", name: "RAIN (YL-83)", code: "", value: "RAIN DETECTED", reading: "2,740", detail: "Sensor Reading (ADC)", state: "WARNING", tone: "blue", icon: CloudRain },
  { id: "tilt", name: "TILT (SW-520D)", code: "", value: "STABLE", detail: "No tilt detected", state: "NORMAL", tone: "purple", icon: TriangleAlert },
  { id: "vibration", name: "VIBRATION (SW-420)", code: "", value: "NO VIBRATION", detail: "No vibration detected", state: "NORMAL", tone: "red", icon: Activity },
];

const monitoringSensorData = [
  { id: "soil", name: "SOIL MOISTURE", code: "Capacitive Sensor", value: "72%", detail: "Moisture Level", state: "WARNING", tone: "green", updated: "10:42:05 AM" },
  { id: "rain", name: "RAIN (YL-83)", code: "ADC Reading", value: "2,740", detail: "Rain Detected (ADC)", state: "WARNING", tone: "blue", updated: "10:42:05 AM" },
  { id: "tilt", name: "TILT (SW-520D)", code: "Detection", value: "STABLE", detail: "No tilt detected", state: "NORMAL", tone: "purple", updated: "10:41:36 AM" },
  { id: "vibration", name: "VIBRATION (SW-420)", code: "Detection", value: "NO VIBRATION", detail: "No vibration detected", state: "NORMAL", tone: "red", updated: "10:42:05 AM" },
];

const recentSensorReadings = [
  { time: "May 27, 2025 10:42:05 AM", sensor: "Soil Moisture (Capacitive)", reading: "72%", status: "Above threshold", condition: "WARNING" },
  { time: "May 27, 2025 10:42:05 AM", sensor: "Rain (YL-83)", reading: "2,740 (ADC)", status: "Rain detected", condition: "WARNING" },
  { time: "May 27, 2025 10:42:05 AM", sensor: "Tilt (SW-520D)", reading: "0 (Stable)", status: "No tilt detected", condition: "NORMAL" },
  { time: "May 27, 2025 10:42:05 AM", sensor: "Vibration (SW-420)", reading: "0 (No Vibration)", status: "No vibration detected", condition: "NORMAL" },
];

const pageMeta = {
  dashboard: ["Dashboard Overview", "Real-time overview of slope conditions and recent activities."],
  sensors: ["Sensor Monitoring", "Real-time monitoring of environmental conditions from slope monitoring sensors."],
  alerts: ["Alerts", "View and manage all system alerts and notifications."],
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

function MetricCard({ icon: Icon, customIcon, tone, label, value, sub, action }) {
  const toneStyles = {
    amber: "bg-[#fff1d5] text-[#ef9c11]",
    blue: "bg-[#eaf2fc] text-[#1e6cd8]",
    purple: "bg-[#f3e8ff] text-[#7c3aed]",
    red: "bg-[#fdeeed] text-[#e02424]",
    green: "bg-[#eaf7ee] text-[#0e7b42]",
  };
  const valueStyles = {
    amber: "text-[#ef9c11]",
    blue: "text-[#1e6cd8]",
    purple: "text-[#7c3aed]",
    red: "text-[#e02424]",
    green: "text-[#0e7b42]",
  };

  return (
    <div className="flex min-h-[174px] flex-col rounded-xl border border-[#dfe7e1] bg-white p-5 shadow-[0_4px_14px_rgba(20,61,42,0.035)]">
      <div className="text-xs font-extrabold uppercase tracking-[0.04em] text-[#27352f]">{label}</div>
      <div className="mt-4 flex min-w-0 items-center gap-3">
        {customIcon ? (
          customIcon
        ) : Icon ? (
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${toneStyles[tone] || toneStyles.blue}`}>
            <Icon size={24} strokeWidth={2.2} />
          </span>
        ) : null}
        <div className="min-w-0">
          <div className={`whitespace-nowrap text-2xl font-black leading-tight tracking-tight ${valueStyles[tone] || valueStyles.blue}`}>
            {value}
          </div>
          <p className="mt-1 max-w-[185px] text-xs leading-4 text-[#526057]">{sub}</p>
        </div>
      </div>
      {action && (
        <button className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-extrabold text-[#087442] hover:underline">
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
        <img src={dashboardIcons.soil} alt="Soil Moisture" className="h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "rain" || sensor.name.includes("Rain") || sensor.name.includes("RAIN")) {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2fc]">
        <img src={dashboardIcons.rain} alt="Rain" className="h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "tilt" || sensor.name.includes("Tilt") || sensor.name.includes("TILT")) {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f3e8ff]">
        <img src={dashboardIcons.stable} alt="Tilt" className="h-5 w-5 object-contain" />
      </span>
    );
  } else {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fdeeed]">
        <img src={dashboardIcons.vibration} alt="Vibration" className="h-6 w-6 object-contain" />
      </span>
    );
  }

  const isRain = sensor.id === "rain" || sensor.name.includes("RAIN") || sensor.name.includes("Rain");

  return (
    <div className="flex min-h-[224px] flex-col rounded-xl border border-[#dfe7e1] bg-white p-5 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
      <div className="flex items-center gap-3">
        {iconElement}
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold uppercase tracking-[0.04em] text-[#303d37]">
            {sensor.name}
          </div>
          {sensor.code && <div className="mt-0.5 text-xs text-[#77847c]">{sensor.code}</div>}
        </div>
      </div>

      <div className="mt-5 min-h-[62px]">
        {isRain ? (
          <div>
            <div className="text-[0.95rem] font-bold uppercase tracking-tight text-[#1e6cd8]">
              {sensor.value}
            </div>
            <div className="mt-0.5 text-xs text-[#55645b]">{sensor.detail}</div>
            <div className="mt-0.5 text-[0.95rem] font-bold text-[#1e6cd8]">
              {sensor.reading || "2,740"}
            </div>
          </div>
        ) : sensor.id === "soil" || sensor.name.includes("Soil") ? (
          <div>
            <div className="text-2xl font-bold leading-tight text-[#0e7b42]">
              {sensor.value}
            </div>
            <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
          </div>
        ) : (
          <div>
            <div
              className={`text-[0.95rem] font-bold uppercase tracking-tight ${
                sensor.tone === "purple"
                  ? "text-[#6d28d9]"
                  : sensor.tone === "red"
                  ? "text-[#e02424]"
                  : "text-[#0e7b42]"
              }`}
            >
              {sensor.value}
            </div>
            <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
          </div>
        )}
      </div>

      <div className="mt-3">
        <span
          className={`inline-block rounded px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-wider ${
            sensor.state === "WARNING"
              ? "bg-[#fff3db] text-[#b87500]"
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
        <span className="font-medium text-[#718078]">10:42 AM</span>
      </div>
    </div>
  );
}

function TableHeader({ children }) { return <div className="grid grid-cols-[1.55fr_1.05fr_1.05fr_0.8fr_0.7fr] gap-3 border-b border-[#e5e9e6] px-4 py-3 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-[#7c8881]">{children}</div>; }

function SensorLegend() {
  const guides = [
    ["soil", "Soil Moisture", "Percentage of water content in soil.", "bg-[#eaf7ee]"],
    ["rain", "Rain (YL-83)", "Raw ADC reading from rain sensor.", "bg-[#eaf2fc]"],
    ["stable", "Tilt (SW-520D)", "Detects tilting events.", "bg-[#f3e8ff]"],
    ["vibration", "Vibration (SW-420)", "Detects vibration events.", "bg-[#fdeeed]"],
  ];

  return (
    <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#27352f]">
        Sensor Legend / Guide
      </h2>
      <div className="mt-5 space-y-4">
        {guides.map(([iconKey, name, detail, bgClass]) => (
          <div key={name} className="flex items-center gap-3.5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${bgClass}`}>
              <img src={dashboardIcons[iconKey]} alt={name} className="h-6 w-6 object-contain" />
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
        <img src={dashboardIcons.soil} alt="Soil Moisture" className="h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "rain") {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2fc]">
        <img src={dashboardIcons.rain} alt="Rain" className="h-6 w-6 object-contain" />
      </span>
    );
  } else if (sensor.id === "tilt") {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f3e8ff]">
        <img src={dashboardIcons.stable} alt="Tilt" className="h-5 w-5 object-contain" />
      </span>
    );
  } else {
    iconElement = (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fdeeed]">
        <img src={dashboardIcons.vibration} alt="Vibration" className="h-6 w-6 object-contain" />
      </span>
    );
  }

  return (
    <div className="flex min-h-[220px] flex-col rounded-xl border border-[#dfe7e1] bg-white p-5 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
      <div className="flex items-center gap-3">
        {iconElement}
        <div className="min-w-0">
          <div className="truncate text-xs font-extrabold uppercase tracking-[0.04em] text-[#303d37]">
            {sensor.name}
          </div>
          <div className="mt-0.5 text-xs text-[#77847c]">{sensor.code}</div>
        </div>
      </div>

      <div className="mt-5 min-h-[62px]">
        <div
          className={`text-2xl font-bold leading-tight ${
            sensor.tone === "green"
              ? "text-[#0e7b42]"
              : sensor.tone === "blue"
              ? "text-[#1e6cd8]"
              : sensor.tone === "purple"
              ? "text-[#6d28d9]"
              : "text-[#e02424]"
          }`}
        >
          {sensor.value}
        </div>
        <div className="mt-1 text-xs text-[#55645b]">{sensor.detail}</div>
      </div>

      <div className="mt-3">
        <span
          className={`inline-block rounded px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-wider ${
            sensor.state === "WARNING"
              ? "bg-[#fff3db] text-[#b87500]"
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


function DashboardOverview({ setPage }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard
          customIcon={<img src={dashboardIcons.warning} alt="Current Alert Level" className="h-12 w-12 shrink-0 object-contain" />}
          tone="amber"
          label="Current Alert Level"
          value="WARNING"
          sub="Conditions are becoming concerning. Please monitor closely."
          action="View Details"
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fdeeed]">
              <img src={dashboardIcons.alerts} alt="Active Alerts" className="h-7 w-7 object-contain" />
            </span>
          }
          tone="red"
          label="Active Alerts"
          value="2"
          sub="Warning Level Alerts"
          action="View Alerts"
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf7ee]">
              <img src={dashboardIcons.sensor} alt="Sensor Status" className="h-7 w-7 object-contain" />
            </span>
          }
          tone="green"
          label="Sensor Status"
          value="4 / 4"
          sub="All sensors are online"
          action="View Sensors"
        />
        <MetricCard
          customIcon={
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf2fc]">
              <img src={dashboardIcons.reports} alt="Incident Reports" className="h-7 w-7 object-contain" />
            </span>
          }
          tone="blue"
          label="Incident Reports"
          value="3"
          sub="Total Reports (This Week)"
          action="View Reports"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <SectionPulseIcon className="w-6 h-6 shrink-0 text-[#0e7b42]" />
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#27352f]">
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
          rows={[
            ["High Soil Moisture Detected", "Soil moisture reached 72%", "10:42 AM", "WARNING", "amber"],
            ["Rain Detected", "YL-83 rain sensor detected rainfall", "10:41 AM", "WARNING", "amber"],
            ["Tilt Sensor Triggered", "Tilt detected at Station SLOPE-01", "Yesterday, 8:15 PM", "DANGER", "red"],
          ]}
          action={() => setPage("alerts")}
        />
        <ActivityList
          title="Recent Incident Reports"
          rows={[
            ["Possible Soil Creep at Sitio East", "Sitio East, Brgy. Malinao", "May 27, 2025 9:15 AM", "PENDING", "amber"],
            ["Small Rock Fall Near Road", "Sitio West, Brgy. Malinao", "May 26, 2025 4:32 PM", "PENDING", "amber"],
            ["Crack on Slope Near House", "Purok 3, Brgy. Malinao", "May 25, 2025 11:20 AM", "RESOLVED", "green"],
          ]}
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
          <img src={dashboardIcons.reports} alt="Report" className="h-5 w-5 object-contain" />
        </span>
      );
    }
    if (index === 0) {
      return (
        <span className="grid h-7 w-7 shrink-0 place-items-center">
          <img src={dashboardIcons.warning} alt="Warning" className="h-6 w-6 object-contain" />
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="grid h-7 w-7 shrink-0 place-items-center">
          <img src={dashboardIcons.rain} alt="Rain" className="h-6 w-6 object-contain" />
        </span>
      );
    }
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center">
        <img src={dashboardIcons.stable} alt="Tilt" className="h-5 w-5 object-contain" />
      </span>
    );
  };

  return (
    <section className="rounded-xl border border-[#dfe7e1] bg-white p-5 shadow-[0_4px_14px_rgba(20,61,42,0.025)]">
      <div className="flex items-center justify-between border-b border-[#edf0ed] pb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.025em] text-[#27352f]">
          {title}
        </h2>
        <button onClick={action} className="text-xs font-bold text-[#087442] hover:underline">
          View All <ChevronRight className="inline" size={14} />
        </button>
      </div>
      <div className="divide-y divide-[#edf0ed]">
        {rows.map((row, index) => (
          <div key={row[0]} className="flex min-h-[68px] items-center gap-3 py-3">
            {rowIcon(row, index)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-[#3b4942]">{row[0]}</div>
              <div className="mt-0.5 truncate text-xs text-[#68776e]">{row[1]}</div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`rounded-md px-2 py-0.5 text-[0.62rem] font-extrabold tracking-wider ${
                  row[3] === "DANGER"
                    ? "bg-[#ffe4e8] text-[#e11d48]"
                    : row[3] === "WARNING" || row[3] === "PENDING"
                    ? "bg-[#fff3db] text-[#b87500]"
                    : "bg-[#eaf7ee] text-[#15803d]"
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

function ReferenceChart({ type }) {
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
      title: "RAIN (YL-83) - ADC READING",
      legend: "Rain ADC",
      color: "#1e6cd8",
      latest: "Latest: 2,740",
      ticks: ["4000", "3000", "2000", "1000", "0"],
      points: "10,50 30,40 50,56 70,44 90,60 110,48 130,34 150,56 170,42 190,60 210,70 230,54 240,34",
      area: "M10 50 L30 40 L50 56 L70 44 L90 60 L110 48 L130 34 L150 56 L170 42 L190 60 L210 70 L230 54 L240 34 L240 118 L10 118 Z",
      showDots: true,
    },
    tilt: {
      title: "TILT (SW-520D) - DETECTION",
      legend: "Tilt Detected (1=Detected, 0=Stable)",
      color: "#7c3aed",
      latest: "Latest: 0 (Stable)",
      ticks: ["1 (Detected)", "0 (Stable)"],
      event: true,
    },
    vibration: {
      title: "VIBRATION (SW-420) - DETECTION",
      legend: "Vibration Detected (1=Detected, 0=Stable)",
      color: "#dc2626",
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
                <rect x="120" y="24" width="34" height="94" fill="#a855f7" fillOpacity="0.15" />
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

function SensorsPage() {
  const [selectedSensor, setSelectedSensor] = useState("All Sensors");
  const [activeTimeRange, setActiveTimeRange] = useState("24H");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {monitoringSensorData.map((sensor) => (
          <MonitoringSensorCard key={sensor.name} sensor={sensor} />
        ))}
      </div>

      <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0ed] pb-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#27352f]">
              Sensor Reading History
            </h2>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-[#64748b]">
              <span>Select Sensor:</span>
              <select
                value={selectedSensor}
                onChange={(e) => setSelectedSensor(e.target.value)}
                className="rounded-lg border border-[#dce4df] bg-white px-3 py-1.5 text-xs font-semibold text-[#1e293b] outline-none hover:border-[#087442] focus:border-[#087442] transition"
              >
                <option>All Sensors</option>
                <option>Soil Moisture</option>
                <option>Rain (YL-83)</option>
                <option>Tilt (SW-520D)</option>
                <option>Vibration (SW-420)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] p-1 text-xs font-semibold">
            {["1H", "6H", "24H", "7D"].map((range) => (
              <button
                key={range}
                onClick={() => setActiveTimeRange(range)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  activeTimeRange === range
                    ? "bg-[#006b37] text-white shadow-sm"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#111827]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {["soil", "rain", "tilt", "vibration"].map((type) => (
            <ReferenceChart key={type} type={type} />
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs text-[#64748b]">
          <Info size={16} className="shrink-0 text-[#087442]" />
          <span>
            Graphs show the last 24 hours of sensor readings. Soil moisture and rain show continuous values. Tilt and vibration show detection events (1) or normal (0). Data is updated every 1 minute.
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-[#dfe7e1] bg-white p-6 shadow-[0_4px_14px_rgba(20,61,42,0.03)]">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#27352f]">
            Recent Sensor Readings
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e9e6] pb-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-[#64748b]">
                  <th className="pb-3 pr-4 font-extrabold">Time</th>
                  <th className="pb-3 pr-4 font-extrabold">Sensor</th>
                  <th className="pb-3 pr-4 font-extrabold">Reading</th>
                  <th className="pb-3 pr-4 font-extrabold">Status</th>
                  <th className="pb-3 text-right font-extrabold">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {recentSensorReadings.map((row) => (
                  <tr key={row.sensor} className="text-xs text-[#475569]">
                    <td className="py-3.5 pr-4 whitespace-nowrap">{row.time}</td>
                    <td className="py-3.5 pr-4 font-bold text-[#1e293b] whitespace-nowrap">{row.sensor}</td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">{row.reading}</td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">{row.status}</td>
                    <td className="py-3.5 text-right whitespace-nowrap">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-[0.65rem] font-extrabold tracking-wider ${
                          row.condition === "WARNING"
                            ? "bg-[#fff3db] text-[#b87500]"
                            : "bg-[#eaf7ee] text-[#15803d]"
                        }`}
                      >
                        {row.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-center">
            <button className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-5 py-2.5 text-xs font-bold text-[#27352f] shadow-sm hover:bg-[#f8fafc] transition">
              View All Sensor Readings <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <SensorLegend />
      </div>
    </div>
  );
}

function MiniChart({ title, color, values, value }) {
  return <div><div className="flex items-start justify-between gap-2"><div><div className="text-[0.63rem] font-extrabold uppercase text-[#53635a]">{title}</div><div className="mt-1 text-[0.58rem] text-[#9aa39e]">Last 24 hours</div></div><div className="text-[0.72rem] font-extrabold" style={{ color }}>{value}</div></div><div className="mt-4 flex h-[100px] items-end gap-1 border-b border-l border-[#e5ebe6] px-2 pb-0 pt-3">{values.map((height, index) => <div key={index} className="flex-1 rounded-t-sm opacity-85" style={{ height: `${height}%`, backgroundColor: color }} />)}</div><div className="mt-2 flex justify-between text-[0.52rem] text-[#a3aca7]"><span>10:00 AM</span><span>4:00 PM</span><span>4:00 AM</span></div></div>;
}

const alertRows = [["High Soil Moisture Detected", "Device 02 / Soil Moisture Sensor", "Zone 2 · Brgy. Sto. Niño", "CRITICAL", "New", "10:35 AM", "red"], ["Heavy Rainfall Detected", "Device 01 / Rainfall Sensor", "Zone 1 · Brgy. Central", "CRITICAL", "New", "10:18 AM", "red"], ["Tilt Threshold Exceeded", "Device 03 / Tilt Sensor", "Zone 3 · Brgy. Riverside", "WARNING", "In Progress", "09:55 AM", "amber"], ["Vibration Detected", "Device 04 / Vibration Sensor", "Zone 4 · Brgy. San Isidro", "WARNING", "New", "09:41 AM", "amber"], ["Device Reconnected", "Device 05 / Soil Moisture Sensor", "Zone 2", "INFO", "Resolved", "08:30 AM", "blue"]];
function AlertsPage({ openSettings, setOpenSettings, markAllTrigger }) {
  const [alerts, setAlerts] = useState([
    {
      id: "ALT-001",
      title: "High Soil Moisture Detected",
      description: "Soil moisture level is above the critical threshold.",
      device: "Device 02",
      sensorType: "Soil Moisture Sensor",
      location: "Zone 2",
      subLocation: "Brgy. Sto. Niño",
      severity: "CRITICAL",
      status: "New",
      date: "May 27, 2025",
      time: "10:35 AM",
      reading: "72%",
      threshold: "70%",
    },
    {
      id: "ALT-002",
      title: "Heavy Rainfall Detected",
      description: "Rainfall intensity is too high.",
      device: "Device 01",
      sensorType: "Rainfall Sensor",
      location: "Zone 1",
      subLocation: "Brgy. Central",
      severity: "CRITICAL",
      status: "New",
      date: "May 27, 2025",
      time: "10:18 AM",
      reading: "2,740 ADC",
      threshold: "2,500 ADC",
    },
    {
      id: "ALT-003",
      title: "Tilt Threshold Exceeded",
      description: "Tilt level exceeds the warning threshold.",
      device: "Device 03",
      sensorType: "Tilt Sensor",
      location: "Zone 3",
      subLocation: "Brgy. Riverside",
      severity: "WARNING",
      status: "In Progress",
      date: "May 27, 2025",
      time: "09:55 AM",
      reading: "1 (Triggered)",
      threshold: "0 (Stable)",
    },
    {
      id: "ALT-004",
      title: "Vibration Detected",
      description: "Unusual vibration detected.",
      device: "Device 04",
      sensorType: "Vibration Sensor",
      location: "Zone 4",
      subLocation: "Brgy. San Isidro",
      severity: "WARNING",
      status: "New",
      date: "May 27, 2025",
      time: "09:41 AM",
      reading: "1 (Triggered)",
      threshold: "0 (Stable)",
    },
    {
      id: "ALT-005",
      title: "Device Reconnected",
      description: "Device 05 is back online.",
      device: "Device 05",
      sensorType: "Soil Moisture Sensor",
      location: "Zone 2",
      subLocation: "Brgy. Sto. Niño",
      severity: "INFO",
      status: "Resolved",
      date: "May 27, 2025",
      time: "08:30 AM",
      reading: "Connected",
      threshold: "N/A",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All Severities");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deviceFilter, setDeviceFilter] = useState("All Devices");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const lastTriggerRef = useRef(markAllTrigger);

  useEffect(() => {
    if (markAllTrigger > 0 && markAllTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = markAllTrigger;
      setAlerts((prev) =>
        prev.map((a) => (a.status === "New" ? { ...a, status: "In Progress" } : a))
      );
      toast.success("All 50 alerts marked as read.");
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
      value: 5,
      label: "Critical Alerts",
      badge: "Requires immediate action",
      valueClass: "text-[#e11d48]",
      badgeClass: "bg-[#ffe4e8] text-[#e11d48]",
    },
    {
      id: "warning",
      icon: dashboardIcons.alertWarning,
      value: 8,
      label: "Warning Alerts",
      badge: "Needs attention",
      valueClass: "text-[#ea580c]",
      badgeClass: "bg-[#fff7ed] text-[#ea580c]",
    },
    {
      id: "info",
      icon: dashboardIcons.alertInfo,
      value: 12,
      label: "Informational",
      badge: "For your information",
      valueClass: "text-[#2563eb]",
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      id: "resolved",
      icon: dashboardIcons.alertResolved,
      value: 25,
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

      {/* Alert Settings Modal */}
      {openSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#dfe7e1] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf0ed] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Settings size={20} className="text-[#006b37]" />
                <h3 className="text-base font-bold text-[#111827]">Alert Threshold Settings</h3>
              </div>
              <button
                onClick={() => setOpenSettings(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#64748b] hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1f2937]">Soil Moisture Critical Limit (%)</label>
                <p className="text-[11px] text-[#64748b] mb-1.5">Triggers Critical alert when moisture exceeds this value.</p>
                <input
                  type="number"
                  defaultValue={70}
                  className="w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1f2937]">Rain Sensor ADC Trigger Threshold</label>
                <p className="text-[11px] text-[#64748b] mb-1.5">Triggers Heavy Rainfall alert when reading exceeds threshold.</p>
                <input
                  type="number"
                  defaultValue={2500}
                  className="w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1f2937]">Tilt & Vibration Sensitivity</label>
                <select className="mt-1.5 w-full rounded-lg border border-[#dfe7e1] px-3 py-2 text-xs font-semibold text-[#1f2937] outline-none focus:border-[#006b37]">
                  <option>High Sensitivity (Instant Trigger)</option>
                  <option defaultValue>Medium Sensitivity (Recommended)</option>
                  <option>Low Sensitivity (Filtered)</option>
                </select>
              </div>

              <div className="border-t border-[#edf0ed] pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setOpenSettings(false)}
                  className="rounded-lg border border-[#dfe7e1] px-4 py-2 text-xs font-bold text-[#64748b] hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setOpenSettings(false);
                    toast.success("Alert settings saved successfully.");
                  }}
                  className="rounded-lg bg-[#006b37] px-4 py-2 text-xs font-bold text-white hover:bg-[#00522a] transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Incident Types");
  const [locationFilter, setLocationFilter] = useState("All Locations");

  const stats = [
    { label: "Total Reports", value: "18", sub: "All time", icon: FileText, color: "text-[#f43f5e]", bg: "bg-[#ffeef0]" },
    { label: "Pending", value: "6", sub: "Awaiting review", icon: Hourglass, color: "text-[#f59e0b]", bg: "bg-[#fffbeb]" },
    { label: "In Progress", value: "9", sub: "Being addressed", icon: Eye, color: "text-[#3b82f6]", bg: "bg-[#eff6ff]" },
    { label: "Resolved", value: "12", sub: "Successfully closed", icon: CheckCircle2, color: "text-[#10b981]", bg: "bg-[#ecfdf5]" },
    { label: "Dismissed", value: "1", sub: "Not a hazard", icon: XCircle, color: "text-[#a855f7]", bg: "bg-[#f3e8ff]" },
  ];

  const reports = [
    {
      id: "#INC-2025-0018",
      type: "Landslide / Soil Movement",
      desc: "Soil movement observed near the slope.",
      icon: "/incident-icons/landslide.png",
      iconBg: "bg-[#fff7ed] border border-[#ffedd5]",
      location: "Purok 4, Zone 2",
      subLocation: "Near Riverbank",
      reporter: "Juan Dela Cruz",
      role: "Resident",
      date: "May 27, 2025",
      time: "09:25 AM",
      status: "Pending",
      statusStyle: "bg-[#fff7ed] text-[#ea580c]",
    },
    {
      id: "#INC-2025-0017",
      type: "Flooding",
      desc: "Water level rising on the drainage area.",
      icon: "/incident-icons/flooding.png",
      iconBg: "bg-[#eff6ff] border border-[#dbeafe]",
      location: "Purok 1, Zone 1",
      subLocation: "Brgy. Central",
      reporter: "Maria Santos",
      role: "Resident",
      date: "May 27, 2025",
      time: "08:15 AM",
      status: "In Progress",
      statusStyle: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      id: "#INC-2025-0016",
      type: "Rockfall / Debris",
      desc: "Rocks falling from the hillside.",
      icon: "/incident-icons/rockfall.png",
      iconBg: "bg-[#fff7ed] border border-[#ffedd5]",
      location: "Purok 5, Zone 3",
      subLocation: "Upper Slope Area",
      reporter: "Pedro Reyes",
      role: "Resident",
      date: "May 26, 2025",
      time: "04:40 PM",
      status: "Resolved",
      statusStyle: "bg-[#ecfdf5] text-[#059669]",
    },
    {
      id: "#INC-2025-0015",
      type: "Crack on Ground",
      desc: "Visible cracks along the road.",
      icon: "/incident-icons/crack.png",
      iconBg: "bg-[#fff7ed] border border-[#ffedd5]",
      location: "Purok 2, Zone 2",
      subLocation: "Along the Road",
      reporter: "Ana Lopez",
      role: "Resident",
      date: "May 26, 2025",
      time: "02:10 PM",
      status: "Pending",
      statusStyle: "bg-[#fff7ed] text-[#ea580c]",
    },
    {
      id: "#INC-2025-0014",
      type: "Blocked Drainage",
      desc: "Drainage is clogged with soil and debris.",
      icon: "/incident-icons/drainage.png",
      iconBg: "bg-[#eff6ff] border border-[#dbeafe]",
      location: "Purok 1, Zone 1",
      subLocation: "Near School",
      reporter: "Ramon Garcia",
      role: "Resident",
      date: "May 26, 2025",
      time: "11:30 AM",
      status: "In Progress",
      statusStyle: "bg-[#eff6ff] text-[#2563eb]",
    },
    {
      id: "#INC-2025-0013",
      type: "Fallen Tree",
      desc: "Tree fell blocking the pathway.",
      icon: "/incident-icons/tree.png",
      iconBg: "bg-[#ecfdf5] border border-[#a7f3d0]",
      location: "Purok 3, Zone 4",
      subLocation: "Near Barangay Hall",
      reporter: "Luisa Villa",
      role: "Resident",
      date: "May 25, 2025",
      time: "03:45 PM",
      status: "Resolved",
      statusStyle: "bg-[#ecfdf5] text-[#059669]",
    },
    {
      id: "#INC-2025-0012",
      type: "Others",
      desc: "Unusual water seepage on slope.",
      icon: "/incident-icons/others.png",
      iconBg: "bg-[#f1f5f9] border border-[#e2e8f0]",
      location: "Purok 6, Zone 3",
      subLocation: "Lower Slope Area",
      reporter: "Mark Angelo",
      role: "Resident",
      date: "May 25, 2025",
      time: "10:20 AM",
      status: "Dismissed",
      statusStyle: "bg-[#f3e8ff] text-[#9333ea]",
    },
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
                  <tr key={row.id} className="hover:bg-[#f8faf8] transition">
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

function SafeAnnouncementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");

  const stats = [
    { label: "Total Announcements", value: "12", sub: "All time", icon: Megaphone, color: "text-[#10b981]", bg: "bg-[#ecfdf5]" },
    { label: "Published", value: "5", sub: "Active and visible", icon: Send, color: "text-[#2563eb]", bg: "bg-[#eff6ff]" },
    { label: "Scheduled", value: "3", sub: "To be published", icon: Clock, color: "text-[#d97706]", bg: "bg-[#fffbeb]" },
    { label: "Archived", value: "4", sub: "No longer visible", icon: Archive, color: "text-[#9333ea]", bg: "bg-[#f3e8ff]" },
  ];

  const announcements = [
    {
      title: "Heavy Rainfall Advisory",
      desc: "Heavy rainfall is expected in the next 24-48 hours. Residents living near slope areas and flood-prone zones are advised to...",
      icon: AlertTriangle,
      iconBg: "bg-[#ffeef0] text-[#ef4444] border border-[#fecdd3]",
      type: "Weather Advisory",
      typeIcon: CloudRain,
      priority: "High",
      priorityStyle: "bg-[#ffeef0] text-[#ef4444]",
      status: "Published",
      statusStyle: "bg-[#ecfdf5] text-[#059669]",
      date: "May 27, 2025",
      time: "09:30 AM",
    },
    {
      title: "Evacuation Reminder",
      desc: "Please be reminded of the designated evacuation centers in your area. Prepare your emergency kits and stay alert.",
      imgIcon: "/incident-icons/evacuation.png",
      iconBg: "bg-[#ecfdf5] border border-[#a7f3d0]",
      type: "Safety Reminder",
      typeIcon: Shield,
      priority: "Medium",
      priorityStyle: "bg-[#fff7ed] text-[#ea580c]",
      status: "Published",
      statusStyle: "bg-[#ecfdf5] text-[#059669]",
      date: "May 26, 2025",
      time: "03:15 PM",
    },
    {
      title: "System Maintenance Notice",
      desc: "Scheduled system maintenance will be conducted tonight from 11:00 PM to 1:00 AM.",
      icon: Info,
      iconBg: "bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]",
      type: "System Update",
      typeIcon: Settings,
      priority: "Low",
      priorityStyle: "bg-[#eff6ff] text-[#3b82f6]",
      status: "Scheduled",
      statusStyle: "bg-[#eff6ff] text-[#2563eb]",
      date: "May 27, 2025",
      time: "11:00 PM",
    },
    {
      title: "Landslide Awareness Tips",
      desc: "Learn the signs of a possible landslide and what actions to take to keep your family safe.",
      icon: Mountain,
      iconBg: "bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]",
      type: "Information",
      typeIcon: FileText,
      priority: "Medium",
      priorityStyle: "bg-[#fff7ed] text-[#ea580c]",
      status: "Published",
      statusStyle: "bg-[#ecfdf5] text-[#059669]",
      date: "May 25, 2025",
      time: "08:00 AM",
    },
    {
      title: "Community Drill Announcement",
      desc: "Join us for the community disaster preparedness drill this Saturday, May 31, 2025 at 8:00 AM.",
      icon: Calendar,
      iconBg: "bg-[#f3e8ff] text-[#9333ea] border border-[#e9d5ff]",
      type: "Event",
      typeIcon: CalendarDays,
      priority: "Medium",
      priorityStyle: "bg-[#fff7ed] text-[#ea580c]",
      status: "Scheduled",
      statusStyle: "bg-[#eff6ff] text-[#2563eb]",
      date: "May 31, 2025",
      time: "08:00 AM",
    },
    {
      title: "Typhoon Preparedness Guide",
      desc: "Important guidelines before, during, and after a typhoon.",
      icon: Archive,
      iconBg: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]",
      type: "Information",
      typeIcon: FileText,
      priority: "Low",
      priorityStyle: "bg-[#eff6ff] text-[#3b82f6]",
      status: "Archived",
      statusStyle: "bg-[#f1f5f9] text-[#64748b]",
      date: "May 20, 2025",
      time: "02:45 PM",
    },
  ];

  const filteredAnnouncements = announcements.filter((row) => {
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              placeholder="Search announcements..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
              <option>All Status</option>
              <option>Published</option>
              <option>Scheduled</option>
              <option>Archived</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
              <option>All Types</option>
              <option>Weather Advisory</option>
              <option>Safety Reminder</option>
              <option>System Update</option>
              <option>Information</option>
              <option>Event</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-[#dfe6e1] bg-white px-3 py-2 text-xs font-medium text-[#475569] shadow-sm outline-none"
            >
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
                  return (
                    <tr key={idx} className="hover:bg-[#f8faf8] transition">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3 max-w-[420px]">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${row.iconBg}`}>
                            {row.imgIcon ? (
                              <img src={row.imgIcon} alt="" className="h-5 w-5 object-contain" />
                            ) : (
                              <IconComponent size={18} />
                            )}
                          </span>
                          <div>
                            <div className="font-bold text-[#1e293b]">{row.title}</div>
                            <div className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed">{row.desc}</div>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0ed] pt-4 text-xs text-[#64748b]">
          <div>Showing 1 to 6 of 12 announcements</div>
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
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50 transition">
              &gt;
            </button>
          </div>
        </div>
      </section>
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
        className={`fixed inset-y-0 left-0 z-40 flex sidebar-terrain w-64 flex-col border-r border-[#e3e9e4] bg-white transition-transform duration-200 md:static ${
          open ? "translate-x-0 md:flex" : "-translate-x-full md:hidden"
        }`}
      >
        <div className="flex h-[76px] items-center border-b border-[#edf0ed] px-6">
          <Logo small />
          <button
            onClick={() => setOpen(false)}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[#7c8a81] md:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 px-4 py-6">
          <nav className="space-y-2">
            {items.map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  page === id
                    ? "bg-[#006b37] text-white shadow-[0_4px_14px_rgba(0,107,55,0.2)]"
                    : "text-[#111827] hover:bg-[#f0f6f1] hover:text-[#006b37]"
                }`}
              >
                <Icon size={20} strokeWidth={2.2} />
                {label}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#111827] transition hover:bg-[#fef2f2] hover:text-[#dc2626]"
            >
              <LogOut size={20} strokeWidth={2.2} />
              Logout
            </button>
          </nav>
        </div>
        <div className="mx-4 mb-5 rounded-2xl border border-white/20 bg-[#04582f]/85 p-3.5 text-white shadow-lg backdrop-blur-sm">
          <div className="text-xs font-bold text-white">System Status</div>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" />
            All Systems Operational
          </div>
          <div className="mt-1.5 text-[10px] text-white/70">
            Last updated: May 27, 2025 10:42 AM
          </div>
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

function Login({ onEnter }) {
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
                <button type="button" className="font-bold text-[#006b37] hover:underline">
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

  const [page, setPage] = useState(() => window.location.hash.replace("#", "") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
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

  useEffect(() => {
    localStorage.setItem("slopesense-profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("slopesense-notifications", JSON.stringify(preferences));
  }, [preferences]);

  if (page === "login") return <Login onEnter={() => setPage("dashboard")} />;
  const [title, subtitle] = pageMeta[page];
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
          <header className="flex h-[76px] items-center justify-between border-b border-[#e5e9e6] bg-white px-6 sm:px-8">
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
                  <div className="text-sm sm:text-base font-bold text-[#087442]">Barangay Malinao, Ormoc City</div>
                  <div className="text-xs text-[#64748b]">Slope Monitoring Station</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#334155] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <CalendarDays size={15} className="text-[#475569]" /> May 27, 2025
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#334155] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <Clock size={15} className="text-[#475569]" /> 10:42 AM
                </div>
              </div>
              <button
                onClick={() => setPage("alerts")}
                className="relative flex items-center justify-center p-2 text-[#0f172a] hover:text-[#087442] hover:bg-[#f1f5f9] rounded-full transition"
                aria-label="Notifications"
              >
                <Bell size={24} strokeWidth={2.2} className="text-[#0f172a]" />
                <span className="absolute -top-0.5 -right-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                  3
                </span>
              </button>
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
                  {page === "alerts" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAlertSettingsOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#dfe7e1] bg-white px-3.5 py-2 text-xs font-bold text-[#1f2937] shadow-sm hover:bg-slate-50 transition"
                      >
                        <Settings size={15} className="text-[#475569]" />
                        Alert Settings
                      </button>
                      <button
                        onClick={() => setMarkAllAlertsTrigger((c) => c + 1)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#006b37] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#00522a] transition"
                      >
                        <Mail size={15} className="text-white" />
                        Mark All as Read
                      </button>
                    </div>
                  )}
                  {page === "incidents" && (
                    <button className="rounded-lg bg-[#087442] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#065e35] transition">
                      + New Incident Report
                    </button>
                  )}
                  {page === "announcements" && (
                    <button className="rounded-lg bg-[#087442] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#065e35] transition">
                      + New Announcement
                    </button>
                  )}
                </div>
                {page === "dashboard" && <DashboardOverview setPage={setPage} />}
                {page === "sensors" && <SensorsPage />}
                {page === "alerts" && (
                  <AlertsPage
                    openSettings={alertSettingsOpen}
                    setOpenSettings={setAlertSettingsOpen}
                    markAllTrigger={markAllAlertsTrigger}
                  />
                )}
                {page === "incidents" && <IncidentReportsPage />}
                {page === "announcements" && <SafeAnnouncementsPage />}
                {page === "profile" && <ReferenceProfilePage profile={profile} setProfile={setProfile} preferences={preferences} setPreferences={setPreferences} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
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
                onClick={() => {
                  const rememberEnabled = localStorage.getItem("slopesense-remember") === "true";
                  if (!rememberEnabled) {
                    localStorage.removeItem("slopesense-remembered-email");
                    localStorage.removeItem("slopesense-remembered-password");
                  }

                  setLogoutConfirmOpen(false);
                  setPage("login");
                }}
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
