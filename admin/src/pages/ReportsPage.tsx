import { useEffect, useState } from 'react';
import { get } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import MiniChart from '../components/MiniChart';
import Skeleton from '../components/Skeleton';
type Report = {
  summary: Record<string, number>;
  daily: Array<{ date: string; orders: number; revenue: number }>;
  paymentMethods: Array<{ method: string; orders: number; revenue: number }>;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
  topCategories: Array<{ name: string; units: number }>;
};
const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    v,
  );
function dates(days: number) {
  const to = new Date(),
    from = new Date(to.getTime() - (days - 1) * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
export default function ReportsPage() {
  const [data, setData] = useState<Report | null>(null),
    [range, setRange] = useState(dates(30)),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setData(
        await get<Report>(
          `/admin/reports/sales?from=${range.from}&to=${range.to}T23:59:59`,
        ),
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [range.from, range.to]);
  function preset(days: number) {
    setRange(dates(days));
  }
  function csv() {
    if (!data) return;
    const lines = [
      ['Date', 'Orders', 'Revenue'],
      ...data.daily.map(x => [x.date, String(x.orders), String(x.revenue)]),
    ];
    const blob = new Blob([lines.map(x => x.join(',')).join('\n')]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cartly-sales-report.csv';
    a.click();
  }
  return (
    <div className="reports-layout">
      <section>
        <div className="section-head">
          <div>
            <h2>Sales performance</h2>
            <p>
              Revenue, demand, discounts and payment mix for the selected
              period.
            </p>
          </div>
          <div className="row-actions">
            <Button variant="secondary" onClick={csv}>
              Export CSV
            </Button>
            <Button onClick={() => window.print()}>Print / PDF</Button>
          </div>
        </div>
        <div className="filter-bar">
          <Button variant="tertiary" onClick={() => preset(1)}>
            Today
          </Button>
          <Button variant="tertiary" onClick={() => preset(7)}>
            7 days
          </Button>
          <Button variant="tertiary" onClick={() => preset(30)}>
            30 days
          </Button>
          <input
            aria-label="From date"
            type="date"
            value={range.from}
            onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
          />
          <input
            aria-label="To date"
            type="date"
            value={range.to}
            onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
          />
        </div>
      </section>
      {loading || !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="stats report">
            {Object.entries(data.summary).map(([key, value]) => (
              <article key={key}>
                <span>{key.replaceAll(/([A-Z])/g, ' $1')}</span>
                <strong>
                  {[
                    'revenue',
                    'discounts',
                    'tax',
                    'shipping',
                    'averageOrderValue',
                    'refunds',
                  ].includes(key)
                    ? money(value)
                    : value.toLocaleString('en-IN')}
                </strong>
              </article>
            ))}
          </div>
          <section>
            <h2>Revenue trend</h2>
            <MiniChart
              label="Revenue by day"
              data={data.daily.map(x => ({
                label: new Date(x.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                }),
                value: x.revenue,
              }))}
            />
            <DataTable
              caption="Daily sales"
              rows={data.daily}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: r => new Date(r.date).toLocaleDateString('en-IN'),
                },
                {
                  key: 'orders',
                  header: 'Orders',
                  numeric: true,
                  render: r => r.orders,
                },
                {
                  key: 'revenue',
                  header: 'Revenue',
                  numeric: true,
                  render: r => money(r.revenue),
                },
              ]}
            />
          </section>
          <div className="report-columns">
            <section>
              <h2>Top products</h2>
              <DataTable
                caption="Top products"
                rows={data.topProducts}
                columns={[
                  { key: 'name', header: 'Product', render: r => r.name },
                  {
                    key: 'units',
                    header: 'Units',
                    numeric: true,
                    render: r => r.units,
                  },
                  {
                    key: 'revenue',
                    header: 'Revenue',
                    numeric: true,
                    render: r => money(r.revenue),
                  },
                ]}
              />
            </section>
            <section>
              <h2>Payment split</h2>
              <DataTable
                caption="Payment methods"
                rows={data.paymentMethods}
                columns={[
                  {
                    key: 'method',
                    header: 'Method',
                    render: r => r.method.toUpperCase(),
                  },
                  {
                    key: 'orders',
                    header: 'Orders',
                    numeric: true,
                    render: r => r.orders,
                  },
                  {
                    key: 'revenue',
                    header: 'Revenue',
                    numeric: true,
                    render: r => money(r.revenue),
                  },
                ]}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
