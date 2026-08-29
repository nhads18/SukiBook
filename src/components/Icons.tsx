import type { ReactNode } from "react";
import type { Cat } from "../lib/data";

type P = { className?: string };

function S({ className = "w-5 h-5", children }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconDash = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </S>
);

export const IconReceipt = (p: P) => (
  <S {...p}>
    <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </S>
);

export const IconBox = (p: P) => (
  <S {...p}>
    <path d="M3.5 7.5 12 3.5l8.5 4v9l-8.5 4-8.5-4z" />
    <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
    <path d="M7.5 5.6l8.6 4" />
  </S>
);

export const IconPeso = (p: P) => (
  <S {...p}>
    <path d="M8.5 20V5.5h5a3.75 3.75 0 0 1 0 7.5h-5" />
    <path d="M6 10h11M6 13h9.5" />
  </S>
);

export const IconUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.4M17.6 14.9c1.6.8 2.6 2.4 2.9 4.6" />
  </S>
);

export const IconChart = (p: P) => (
  <S {...p}>
    <path d="M4 4v16h16" />
    <path d="M8 16v-5M12 16V7.5M16 16v-3M20 16V9.5" />
  </S>
);

export const IconGear = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
  </S>
);

export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconMinus = (p: P) => (
  <S {...p}>
    <path d="M5 12h14" />
  </S>
);

export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m19.5 19.5-4.7-4.7" />
  </S>
);

export const IconX = (p: P) => (
  <S {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </S>
);

export const IconAlert = (p: P) => (
  <S {...p}>
    <path d="M12 4 2.8 19.5h18.4z" />
    <path d="M12 10v4M12 16.8v.2" />
  </S>
);

export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5" />
    <path d="M10 10.5v6M14 10.5v6" />
  </S>
);

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </S>
);

export const IconPrint = (p: P) => (
  <S {...p}>
    <path d="M7 8V3.5h10V8" />
    <rect x="4" y="8" width="16" height="8" rx="1.5" />
    <path d="M7 13.5h10v7H7z" />
  </S>
);

export const IconSms = (p: P) => (
  <S {...p}>
    <path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </S>
);

export const IconPhone = (p: P) => (
  <S {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2.5" />
    <path d="M10.5 17.5h3" />
  </S>
);

export const IconMonitor = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" />
    <path d="M9 20h6M12 16v4" />
  </S>
);

export const IconUp = (p: P) => (
  <S {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </S>
);

export const IconDown = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </S>
);

export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </S>
);

export const IconSync = (p: P) => (
  <S {...p}>
    <path d="M5 12a7 7 0 0 1 12.3-4.6L19.5 9.5" />
    <path d="M19.5 5v4.5H15M19 12a7 7 0 0 1-12.3 4.6L4.5 14.5" />
    <path d="M4.5 19v-4.5H9" />
  </S>
);

export const IconWallet = (p: P) => (
  <S {...p}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
    <path d="M14.5 12h5.5v3h-5.5a1.5 1.5 0 0 1 0-3z" />
  </S>
);

export const IconBasket = (p: P) => (
  <S {...p}>
    <path d="M4 9.5h16l-1.6 10H5.6z" />
    <path d="m8 9.5 3-6M16 9.5l-3-6M9.5 13v3.5M14.5 13v3.5" />
  </S>
);

export const IconSend = (p: P) => (
  <S {...p}>
    <path d="M20 4 3.5 10.5l6 2.5L12 19.5z" />
    <path d="M20 4 9.5 13" />
  </S>
);

export const IconChevR = (p: P) => (
  <S {...p}>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </S>
);

export const IconArrowL = (p: P) => (
  <S {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </S>
);

export const IconSignal = (p: P) => (
  <S {...p}>
    <path d="M5 18v-3M9.5 18v-6M14 18V8M18.5 18V4.5" />
  </S>
);

export const IconBattery = (p: P) => (
  <S {...p}>
    <rect x="3" y="8" width="15" height="8" rx="2" />
    <path d="M21 11v2M6 11v2M9.5 11v2" />
  </S>
);

export const IconSheets = (p: P) => (
  <S {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
    <path d="M4.5 9h15M4.5 14.5h15M10 9v11.5" />
  </S>
);

/* ---------- hand-drawn category glyphs for product tiles ---------- */

export function CategoryGlyph({ cat, className = "w-5 h-5" }: { cat: Cat; className?: string }) {
  const paths: Record<Cat, ReactNode> = {
    noodles: (
      <>
        <path d="M5 10.5h14l-1.4 8.5a1.6 1.6 0 0 1-1.6 1.3H8a1.6 1.6 0 0 1-1.6-1.3z" />
        <path d="M9 7.5c0-1.4 1-1.4 1-2.8M13.5 7.5c0-1.4 1-1.4 1-2.8" />
      </>
    ),
    coffee: (
      <>
        <path d="M5.5 10h11v6.5a3 3 0 0 1-3 3h-5a3 3 0 0 1-3-3z" />
        <path d="M16.5 11.5h1.5a2 2 0 0 1 0 4h-1.5M9 7c0-1.2.9-1.2.9-2.4M12.5 7c0-1.2.9-1.2.9-2.4" />
      </>
    ),
    snacks: (
      <>
        <path d="M7 6.5 6 18.5a1.5 1.5 0 0 0 1.5 1.6h9a1.5 1.5 0 0 0 1.5-1.6l-1-12z" />
        <path d="M7 6.5c1.5-1.4 8.5-1.4 10 0M9.8 12.2a2.3 2.3 0 1 0 4.4 0 2.3 2.3 0 0 0-4.4 0z" />
      </>
    ),
    drinks: (
      <>
        <path d="M10 3.5h4v3l1.5 2.5v10a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 19V9L10 6.5z" />
        <path d="M8.5 12.5h7" />
      </>
    ),
    staples: (
      <>
        <path d="M8 6.5C6.5 9 5.5 12.5 5.5 15.5a4.5 4.5 0 0 0 4.5 4.5h4a4.5 4.5 0 0 0 4.5-4.5c0-3-1-6.5-2.5-9z" />
        <path d="M9.5 6.5 12 4l2.5 2.5M9.5 6.5h5M10.5 13.5v3M13.5 12.5v4" />
      </>
    ),
    household: (
      <>
        <rect x="5.5" y="7.5" width="13" height="12.5" rx="1.5" />
        <path d="M5.5 11.5h13M12 14.2c-1 1.3-1.6 2-1.6 2.8a1.6 1.6 0 0 0 3.2 0c0-.8-.6-1.5-1.6-2.8z" />
        <path d="M9 7.5V5h6v2.5" />
      </>
    ),
    personal: (
      <>
        <path d="M9.5 9.5h5V19a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 9.5 19z" />
        <path d="M11 9.5V6.5h2v3M11 6.5V4h4.5v1.5" />
      </>
    ),
  };
  return <S className={className}>{paths[cat]}</S>;
}

/* ------------ brand mark: little awning over a peso coin ---------- */

export function LogoMark({ className = "w-9 h-9" }: P) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="#103524" />
      <path
        d="M7 12h26l-2.5 5.5c-.8 1.7-3.2 1.7-4 0-.8 1.7-3.2 1.7-4 0-.8 1.7-3.2 1.7-4 0-.8 1.7-3.2 1.7-4 0-.8 1.7-3.2 1.7-4 0L7 12z"
        fill="#F6A81C"
      />
      <path
        d="M16 31V19.5h5a3.4 3.4 0 0 1 0 6.8h-5M13.5 23.5h10M13.5 26.5h8.5"
        stroke="#F6A81C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export const IconRocket = (p: P) => (
  <S {...p}>
    <path d="M12 3c3 2.2 4.5 5.2 4.5 9.2L12 15.5 7.5 12.2C7.5 8.2 9 5.2 12 3z" />
    <circle cx="12" cy="9.3" r="1.7" />
    <path d="m7.5 12.2-3 2.4 3.2.9M16.5 12.2l3 2.4-3.2.9" />
    <path d="M10.5 16.3c0 2 .7 3.5 1.5 4.7.8-1.2 1.5-2.7 1.5-4.7" />
  </S>
);

export const IconCopy = (p: P) => (
  <S {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M16 4.5H6a2 2 0 0 0-2 2v10" />
  </S>
);
