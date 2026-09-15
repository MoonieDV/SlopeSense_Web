import React from "react";

/**
 * Pixel-accurate, razor-sharp vector SVG icons matching the SlopeSense reference dashboard.
 * Pure vector paths ensure zero blurriness, no pixelation, and perfect clarity at any scale.
 */

// 1. Solid amber Warning Triangle (Card 1: Current Alert Level & Recent Alerts row 1)
export function WarningTriangleIcon({ className = "w-12 h-12" }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Warning"
    >
      <path
        d="M19.4 6.8c1.15-2 4.05-2 5.2 0l16.2 28.1c1.15 2-.3 4.5-2.6 4.5H5.8c-2.3 0-3.75-2.5-2.6-4.5L19.4 6.8z"
        fill="#F99D1C"
      />
      <rect x="20" y="16.5" width="4" height="11" rx="2" fill="#FFFFFF" />
      <circle cx="22" cy="32.5" r="2.2" fill="#FFFFFF" />
    </svg>
  );
}

// 2. Active Alerts Bell Icon (Card 2: Active Alerts)
export function ActiveAlertsBellIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E02424"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Active Alerts"
    >
      <path d="M10.2 4a2 2 0 1 1 3.6 0" />
      <path d="M18 16c-1.2-1.5-2-3.8-2-7a4 4 0 0 0-8 0c0 3.2-.8 5.5-2 7h12z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

// 3. Sensor Status Wi-Fi / Radio Broadcast Icon (Card 3: Sensor Status)
export function SensorStatusWifiIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0E7B42"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Sensor Status"
    >
      <path d="M4 8.5a13 13 0 0 1 16 0" />
      <path d="M7 12.5a8.5 8.5 0 0 1 10 0" />
      <path d="M10 16.5a4.2 4.2 0 0 1 4 0" />
      <circle cx="12" cy="19.5" r="1.3" fill="#0E7B42" stroke="none" />
    </svg>
  );
}

// 4. Incident Reports Clipboard Icon (Card 4: Incident Reports)
export function IncidentReportsClipboardIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1E6CD8"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Incident Reports"
    >
      <rect x="5.5" y="4.5" width="13" height="16.5" rx="2.5" />
      <path d="M9 4.5V3.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3.5v1" />
      <line x1="8.5" y1="10" x2="15.5" y2="10" />
      <line x1="8.5" y1="14" x2="13.5" y2="14" />
    </svg>
  );
}

// 5. Soil Moisture Teardrop Icon with Smile Indicator (Sensor Card 1)
export function SoilMoistureDropIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Soil Moisture"
    >
      <path
        d="M12 2.8C12 2.8 5.8 10.4 5.8 15C5.8 18.4 8.6 21.2 12 21.2C15.4 21.2 18.2 18.4 18.2 15C18.2 10.4 12 2.8 12 2.8Z"
        fill="#0B6B3B"
      />
      <path
        d="M9.2 14.6C9.6 16.4 10.7 17.6 12 17.6C13.3 17.6 14.4 16.4 14.8 14.6"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 6. Rain Cloud Icon with 4 Drops (Sensor Card 2 & Recent Alerts row 2)
export function RainCloudIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Rain"
    >
      <path
        d="M5.5 14A4 4 0 0 1 8.8 9.8 5.2 5.2 0 0 1 18.5 11 3.8 3.8 0 0 1 20.5 17.5H6a2.5 2.5 0 0 1-.5-3.5z"
        stroke="#1E6CD8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 20.5l-1 2.5" stroke="#1E6CD8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11.8 20.5l-1 2.5" stroke="#1E6CD8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M15.5 20.5l-1 2.5" stroke="#1E6CD8" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19.2 20.5l-1 2.5" stroke="#1E6CD8" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 7. Tilt Triangle Outline Icon (Sensor Card 3 & Recent Alerts row 3)
export function TiltTriangleIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tilt"
    >
      <polygon
        points="12,3.8 21.5,19.8 2.5,19.8"
        stroke="#7C3AED"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 8. Vibration Pulse / Heartbeat Wave Icon (Sensor Card 4)
export function VibrationPulseIcon({ className = "w-7 h-7" }) {
  return (
    <svg
      viewBox="0 0 30 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vibration"
    >
      <path
        d="M2 12h4.5l2-4 3 12 3.5-17 3 13.5 2-4.5H28"
        stroke="#E02424"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 9. Incident Document / Sheet Icon (Recent Incident Reports list)
export function IncidentDocumentIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#15803D"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Incident Document"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="12.5" x2="16" y2="12.5" />
      <line x1="8" y1="16" x2="14" y2="16" />
    </svg>
  );
}

// 10. Pulse wave icon next to "CURRENT SENSOR STATUS" heading
export function SectionPulseIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 26 18"
      fill="none"
      stroke="#0E7B42"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Pulse"
    >
      <path d="M2 9h4l2-3 3 9 3-12 2.5 8 1.5-2H24" />
    </svg>
  );
}

