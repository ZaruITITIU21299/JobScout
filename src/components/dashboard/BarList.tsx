type BarListProps = {
  caption: string;
  items: { label: string; value: number }[];
};

/** Horizontal bars with the number always shown as text, so the chart works without seeing the bars. */
export function BarList({ caption, items }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <th scope="row" className="w-28 py-1.5 pr-3 text-left font-normal text-muted">
              {item.label}
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 bg-bg">
                  <div className="h-3 bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-mono">{item.value}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
