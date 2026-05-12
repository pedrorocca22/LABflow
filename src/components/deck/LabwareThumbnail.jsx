export default function LabwareThumbnail({ labware, remainingVolumeUl, maxVolume }) {
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
        ? Math.max(0.05, Math.min(1, remainingVolumeUl / maxVolume))
        : 0;

    return (
      <svg viewBox="0 0 100 60" className="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet">
        <rect x={4} y={4} width={92} height={52} rx={4} className="fill-surface-200 stroke-surface-300" strokeWidth={1} />
        {fillPercent > 0 && (
          <rect
            x={4}
            y={4 + 52 * (1 - fillPercent)}
            width={92}
            height={52 * fillPercent}
            rx={4}
            className="fill-primary-300"
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
