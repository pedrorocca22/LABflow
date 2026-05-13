import { useId } from 'react';

// ─── Well Plate ────────────────────────────────────────────────────────────────
function WellPlateThumb({ grid }) {
  const cols = grid.columns;
  const rows = grid.rows;
  const spacing = 10;
  const margin = 4;
  const width = cols * spacing + margin * 2;
  const height = rows * spacing + margin * 2;
  const radius = Math.min(3, spacing / 2 - 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full max-w-[90%]"
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={margin + c * spacing + spacing / 2}
            cy={margin + r * spacing + spacing / 2}
            r={radius}
            fill="currentColor"
            className="text-surface-300"
          />
        ))
      )}
    </svg>
  );
}

// ─── Tip Rack ──────────────────────────────────────────────────────────────────
function TipRackThumb({ grid, availableTips }) {
  const cols = grid.columns;
  const rows = grid.rows;
  const spacing = 10;
  const margin = 4;
  const width = cols * spacing + margin * 2;
  const height = rows * spacing + margin * 2;
  const w = spacing - 2;
  const h = spacing - 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-w-[90%]" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const wellId = `${String.fromCharCode(65 + r)}${c + 1}`;
          // Si availableTips no está definido, asumimos todas disponibles por defecto
          const hasTip = availableTips ? availableTips.includes(wellId) : true;

          return (
            <g key={wellId}>
              <rect
                x={margin + c * spacing + 1}
                y={margin + r * spacing + 1}
                width={w}
                height={h}
                rx={1}
                fill="#e2e8f0"
              />
              {hasTip && (
                <circle
                  cx={margin + c * spacing + spacing / 2}
                  cy={margin + r * spacing + spacing / 2}
                  r={2.5}
                  fill="#f97316"
                />
              )}
            </g>
          );
        })
      )}
    </svg>
  );
}

// ─── Reservoir ─────────────────────────────────────────────────────────────────
function ReservoirThumb({ remainingVolumeUl, maxVolume, isSelectable, isSelected, onSelect }) {
  const clipId = useId();

  const fillPercent =
    remainingVolumeUl != null && maxVolume > 0
      ? Math.max(0, Math.min(1, remainingVolumeUl / maxVolume))
      : 0;

  const isEmpty = fillPercent === 0;
  const isLow = fillPercent > 0 && fillPercent <= 0.25;
  const isMedium = fillPercent > 0.25 && fillPercent <= 0.65;

  const liquidColor = isEmpty
    ? 'transparent'
    : isLow
    ? '#f87171'
    : isMedium
    ? '#60a5fa'
    : '#3b82f6';

  const volumeText =
    remainingVolumeUl != null
      ? remainingVolumeUl >= 1000
        ? `${(remainingVolumeUl / 1000).toFixed(1)} mL`
        : `${Math.round(remainingVolumeUl)} µL`
      : '—';

  // SVG geometry to match 96-well plate (128x88)
  const TANK_X = 4;
  const TANK_Y = 4;
  const TANK_W = 120;
  const TANK_H = 80;
  const RX = 3; // Radios más pequeños

  const liquidH = TANK_H * fillPercent;
  const liquidY = TANK_Y + TANK_H - liquidH;

  return (
    <svg
      viewBox="0 0 128 88"
      className="w-full h-full max-w-[90%]"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: isSelectable ? 'pointer' : 'default' }}
      onClick={isSelectable ? onSelect : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={TANK_X} y={TANK_Y} width={TANK_W} height={TANK_H} rx={RX} />
        </clipPath>
      </defs>

      {/* ── Tank body ── */}
      <rect
        x={TANK_X}
        y={TANK_Y}
        width={TANK_W}
        height={TANK_H}
        rx={RX}
        fill="#e2e8f0"
      />

      {/* ── Liquid fill ── */}
      <rect
        x={TANK_X}
        y={liquidY}
        width={TANK_W}
        height={liquidH}
        fill={liquidColor}
        clipPath={`url(#${clipId})`}
        style={{ transition: 'y 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), fill 0.3s ease' }}
      />

      {/* ── Volume label ── */}
      <text
        x={64}
        y={44}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isEmpty ? '#94a3b8' : '#1e293b'}
        style={{
          fontSize: '15px',
          fontWeight: 700,
          fontFamily: "ui-rounded, 'Nunito', 'Quicksand', 'Varela Round', system-ui, sans-serif",
          letterSpacing: '-0.02em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {volumeText}
      </text>

      {/* ── Selection ring ── */}
      {isSelected && (
        <rect
          x={TANK_X - 2}
          y={TANK_Y - 2}
          width={TANK_W + 4}
          height={TANK_H + 4}
          rx={RX + 2}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          style={{ transition: 'opacity 0.2s ease' }}
        />
      )}

      {/* ── Selectable hover ring ── */}
      {isSelectable && !isSelected && (
        <rect
          x={TANK_X - 1}
          y={TANK_Y - 1}
          width={TANK_W + 2}
          height={TANK_H + 2}
          rx={RX + 1}
          fill="none"
          stroke="#93c5fd"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
      )}
    </svg>
  );
}

// ─── Generic fallback ───────────────────────────────────────────────────────────
function GenericThumb() {
  return (
    <svg viewBox="0 0 60 40" className="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet">
      <rect x={4} y={4} width={52} height={32} rx={4} fill="currentColor" className="text-surface-200" />
    </svg>
  );
}

// ─── Public export ──────────────────────────────────────────────────────────────
export default function LabwareThumbnail({ labware, remainingVolumeUl, maxVolume, isSelectable, isSelected, onSelect }) {
  if (!labware) return null;

  const category = labware.metadata.displayCategory;
  const { grid } = labware;

  if (category === 'wellPlate' && grid) return <WellPlateThumb grid={grid} />;
  if (category === 'tipRack' && grid) return <TipRackThumb grid={grid} availableTips={labware.deckConfig?.availableTips} />;
  if (category === 'reservoir')
    return (
      <ReservoirThumb
        remainingVolumeUl={remainingVolumeUl}
        maxVolume={maxVolume}
        isSelectable={isSelectable}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  return <GenericThumb />;
}
