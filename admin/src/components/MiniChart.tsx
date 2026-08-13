type ChartPoint = { label: string; value: number };

export default function MiniChart({
  data,
  label,
}: {
  data: ChartPoint[];
  label: string;
}) {
  const visible = data.filter(item => Number.isFinite(item.value));
  if (!visible.length)
    return <p className="chart-empty">No data for this period.</p>;

  const max = Math.max(1, ...visible.map(item => item.value));
  return (
    <div className="mini-chart" role="img" aria-label={label}>
      {visible.map(item => (
        <div
          className="chart-item"
          key={item.label}
          title={`${item.label}: ${item.value}`}
        >
          <span>{item.label}</span>
          <div className="chart-bar">
            <i style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} />
          </div>
          <strong>{item.value.toLocaleString('en-IN')}</strong>
        </div>
      ))}
    </div>
  );
}
