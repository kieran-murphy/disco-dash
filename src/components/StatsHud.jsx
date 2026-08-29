"use client";
import { useEffect, useRef, useState } from "react";
import { DollarSign, Users, Crown } from "lucide-react";

const STATS = [
  { key: "money", label: "Money", Icon: DollarSign, format: (v) => `$${v.toLocaleString()}` },
  { key: "customers", label: "Customers", Icon: Users },
  { key: "vipPoints", label: "VIP Points", Icon: Crown, format: (v) => `${v}` },
];

// One stat tile. Tracks its own previous value so it can react the instant its own prop
// increases with a quick scale pulse on the number — replayed via a `key` remount rather
// than JS-driven class toggling, since a fresh element restarts a CSS animation for free.
// The floating "+N" for the gain itself is drawn on the canvas (see ClubGameInner), closer
// to whichever dancer earned it, rather than duplicated here.
function StatTile({ label, Icon, value, format }) {
  const prevValueRef = useRef(value);
  const [bumpId, setBumpId] = useState(0);

  useEffect(() => {
    const delta = value - prevValueRef.current;
    prevValueRef.current = value;
    if (delta > 0) {
      setBumpId((id) => id + 1);
    }
  }, [value]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#3f3f6b] bg-[#15152b]/90 px-4 py-2 shadow-[0_0_12px_rgba(95,227,255,0.25)] backdrop-blur-sm">
      <Icon className="h-5 w-5 text-[#5fe3ff]" strokeWidth={2} />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] tracking-wide text-[#aab0ff] uppercase">{label}</span>
        <span key={bumpId} className="animate-stat-bump text-sm font-semibold text-white">
          {format(value)}
        </span>
      </div>
    </div>
  );
}

// Button that spends VIP points to trigger VIP mode — see ClubGameInner's buyVipMode. Locked
// out while one is already active, not just when unaffordable. Styled to match the StatTiles
// it sits alongside, but interactive, so it needs pointer-events re-enabled since the HUD
// container it lives in is click-through.
function VipModeButton({ vipPoints, vipCost, vipModeActive, vipModeRemainingMs, onBuyVip }) {
  const canAfford = vipPoints >= vipCost;
  const label = vipModeActive ? `VIP ${Math.ceil(vipModeRemainingMs / 1000)}s` : `Buy VIP (${vipCost})`;
  return (
    <button
      type="button"
      onClick={onBuyVip}
      disabled={!canAfford || vipModeActive}
      className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#ff5fd1] bg-[#2b1530]/90 px-4 py-2 text-sm font-semibold text-[#ff5fd1] shadow-[0_0_12px_rgba(255,95,209,0.35)] backdrop-blur-sm transition hover:bg-[#3a1c40] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#2b1530]/90"
    >
      <Crown className="h-4 w-4" strokeWidth={2} />
      {label}
    </button>
  );
}

// Overlay HUD showing the club's running stats. The dance floor <Rect> in ClubGameInner is
// inset 5% from the canvas edges, so this is inset to match — flush with the visible floor
// panel's top-right corner rather than the canvas's outer (unpainted) edge.
export default function StatsHud({ money, customers, vipPoints, maxCustomers, vipCost, vipModeActive, vipModeRemainingMs, onBuyVip }) {
  const values = { money, customers, vipPoints };
  const formats = { customers: (v) => `${v} / ${maxCustomers}` };
  return (
    <div className="pointer-events-none fixed top-[calc(5%+1rem)] right-[calc(5%+1rem)] z-10 flex gap-3">
      {STATS.map(({ key, label, Icon, format }) => (
        <StatTile key={key} label={label} Icon={Icon} value={values[key]} format={formats[key] ?? format} />
      ))}
      <VipModeButton vipPoints={vipPoints} vipCost={vipCost} vipModeActive={vipModeActive} vipModeRemainingMs={vipModeRemainingMs} onBuyVip={onBuyVip} />
    </div>
  );
}
