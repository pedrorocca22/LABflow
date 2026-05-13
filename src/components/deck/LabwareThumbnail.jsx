export default function LabwareThumbnail({ labware, remainingVolumeUl, maxVolume, isSelectable, isSelected, onSelect }) {
  if (!labware) return null;

  const category = labware.metadata.displayCategory;
  const { grid, wellProperties } = labware;

  if (category === 'wellPlate' && grid) {
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
              className="fill-surface-300"
            />
          ))
        )}
      </svg>
    );
  }

  if (category === 'reservoir') {
    const fillPercent =
      remainingVolumeUl != null && maxVolume > 0
        ? Math.max(0, Math.min(1, remainingVolumeUl / maxVolume))
        : 0;
    const percentText = Math.round(fillPercent * 100);
    const volumeText = remainingVolumeUl != null
      ? (remainingVolumeUl >= 1000
          ? `${(remainingVolumeUl / 1000).toFixed(1)} mL`
          : `${Math.round(remainingVolumeUl)} µL`)
      : 'Vacío';

    return (
      <svg
        viewBox="0 0 100 70"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ cursor: isSelectable ? 'pointer' : 'default' }}
        onClick={isSelectable ? onSelect : undefined}
      >
        {/* Background */}
        <rect
          x={4}
          y={4}
          width={92}
          height={62}
          rx={8}
          className="fill-primary-500"
        />

        {/* Percentage - large, centered, white */}
        <text
          x={50}
          y={30}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white pointer-events-none select-none"
          style={{ fontSize: '24px', fontWeight: 800 }}
        >
          {percentText}%
        </text>

        {/* Volume - smaller, below, white */}
        <text
          x={50}
          y={50}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white/90 pointer-events-none select-none"
          style={{ fontSize: '10px', fontWeight: 600 }}
        >
          {volumeText}
        </text>

        {/* Selection ring */}
        {isSelected && (
          <rect
            x={2}
            y={2}
            width={96}
            height={66}
            rx={10}
            fill="none"
            className="stroke-white"
            strokeWidth={2.5}
          />
        )}
      </svg>
    );
  }

  if (category === 'tipRack' && grid) {
    const cols = grid.columns;
    const rows = grid.rows;
    const spacing = 8;
    const margin = 3;
    const width = cols * spacing + margin * 2;
    const height = rows * spacing + margin * 2;
    const w = spacing - 2;
    const h = spacing - 1;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={margin + c * spacing + 1}
              y={margin + r * spacing + 1}
              width={w}
              height={h}
              rx={1}
              className="fill-surface-300"
            />
          ))
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 60 40" className="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet">
      <rect x={4} y={4} width={52} height={32} rx={4} className="fill-surface-200 stroke-surface-300" strokeWidth={1} />
    </svg>
  );
}
