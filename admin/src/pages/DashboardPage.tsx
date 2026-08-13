import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  Boxes,
  CalendarDays,
  CreditCard,
  Clock3,
  RotateCcw,
  ShoppingBag,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import DataTable from '../components/DataTable';
import MiniChart from '../components/MiniChart';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
type Dashboard = {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  averageOrderValue: number;
  newCustomers: number;
  pendingFulfilment: number;
  pendingReturns: number;
  failedPayments: number;
  lowStockCount: number;
  outOfStock: number;
  comparisonPercent: number;
  orderTotals: Record<string, number>;
  paymentMethods: Array<{ method: string; orders: number; revenue: number }>;
  revenueTrend: Array<{ date: string; value: number }>;
  lowStock: Array<{
    id: string;
    sku: string;
    stock: number;
    price: number;
    product: { id: string; name: string };
  }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    user: { name: string };
  }>;
  recentReturns: Array<{
    id: string;
    status: string;
    reason: string;
    refundAmount: number;
    order: { number: string };
    user: { name: string };
  }>;
};
const money = (v: unknown) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));
export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null),
    [days, setDays] = useState('30');
  useEffect(() => {
    const to = new Date(),
      from = new Date(to.getTime() - (Number(days) - 1) * 86400000);
    void get<Dashboard>(
      `/admin/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
    ).then(setData);
  }, [days]);
  if (!data) return <Skeleton />;
  const trend = data.comparisonPercent;
  const cards = [
    ['Revenue today', money(data.revenueToday), BadgeIndianRupee, '/reports'],
    ['Revenue this week', money(data.revenueWeek), CalendarDays, '/reports'],
    ['Revenue this month', money(data.revenueMonth), WalletCards, '/reports'],
    [
      'Average order value',
      money(data.averageOrderValue),
      ShoppingBag,
      '/orders',
    ],
    ['New customers', data.newCustomers, UserPlus, '/customers'],
    ['Pending fulfilment', data.pendingFulfilment, Clock3, '/orders'],
    ['Pending returns', data.pendingReturns, RotateCcw, '/returns'],
    ['Failed payments', data.failedPayments, CreditCard, '/orders'],
    [
      'Low / out of stock',
      `${data.lowStockCount} / ${data.outOfStock}`,
      Boxes,
      '/products',
    ],
  ] as const;
  return (
    <>
      <div className="dashboard-toolbar">
        <div>
          <h2>Store performance</h2>
          <p>Operational and revenue data for the selected period.</p>
        </div>
        <label>
          Date range
          <select value={days} onChange={e => setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <div className="kpi-grid">
        {cards.map(([label, value, Icon, to]) => (
          <Link className="kpi-card" to={to} key={label}>
            <div className="kpi-icon">
              <Icon size={19} />
            </div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small className={trend >= 0 ? 'trend-up' : 'trend-down'}>
              {trend >= 0 ? (
                <ArrowUpRight size={13} />
              ) : (
                <ArrowDownRight size={13} />
              )}{' '}
              {Math.abs(trend).toFixed(1)}% vs previous period
            </small>
          </Link>
        ))}
      </div>
      <div className="chart-grid">
        <section>
          <h2>Revenue trend</h2>
          <MiniChart
            label="Revenue trend"
            data={data.revenueTrend.map(item => ({
              label: new Date(item.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              }),
              value: item.value,
            }))}
          />
        </section>
        <section>
          <h2>Orders by status</h2>
          <MiniChart
            label="Orders by status"
            data={Object.entries(data.orderTotals).map(([label, value]) => ({
              label: label.replaceAll('_', ' '),
              value,
            }))}
          />
        </section>
        <section>
          <h2>Payment methods</h2>
          <MiniChart
            label="Payment methods"
            data={data.paymentMethods.map(item => ({
              label: item.method,
              value: item.revenue,
            }))}
          />
        </section>
      </div>
      <div className="dashboard-tables">
        <section>
          <div className="card-heading">
            <h2>Recent orders</h2>
            <Link to="/orders">View all</Link>
          </div>
          <DataTable
            rows={data.recentOrders}
            columns={[
              { key: 'order', header: 'Order', render: r => r.number },
              { key: 'customer', header: 'Customer', render: r => r.user.name },
              { key: 'total', header: 'Total', render: r => money(r.total) },
              {
                key: 'payment',
                header: 'Payment',
                render: r => <StatusBadge value={r.paymentStatus} />,
              },
              {
                key: 'status',
                header: 'Status',
                render: r => <StatusBadge value={r.status} />,
              },
            ]}
          />
        </section>
        <section>
          <div className="card-heading">
            <h2>Recent returns</h2>
            <Link to="/returns">View all</Link>
          </div>
          <DataTable
            rows={data.recentReturns}
            columns={[
              { key: 'order', header: 'Order', render: r => r.order.number },
              { key: 'customer', header: 'Customer', render: r => r.user.name },
              { key: 'reason', header: 'Reason', render: r => r.reason },
              {
                key: 'status',
                header: 'Status',
                render: r => <StatusBadge value={r.status} />,
              },
            ]}
          />
        </section>
      </div>
      <section>
        <div className="card-heading">
          <h2>Stock requiring attention</h2>
          <Link to="/products">Manage stock</Link>
        </div>
        <DataTable
          rows={data.lowStock}
          columns={[
            { key: 'product', header: 'Product', render: r => r.product.name },
            { key: 'sku', header: 'SKU', render: r => r.sku },
            {
              key: 'stock',
              header: 'Stock',
              render: r => <strong className="low-stock">{r.stock}</strong>,
            },
            { key: 'price', header: 'Price', render: r => money(r.price) },
            {
              key: 'edit',
              header: 'Action',
              render: r => (
                <Link
                  className="table-link"
                  to={`/products?edit=${r.product.id}`}
                >
                  Edit product
                </Link>
              ),
            },
          ]}
        />
      </section>
      <div className="quick-actions">
        <span>Quick actions</span>
        <Link to="/products?create=1">Add product</Link>
        <Link to="/orders">Process orders</Link>
        <Link to="/returns">Review returns</Link>
        <Link to="/reports">Open reports</Link>
      </div>
    </>
  );
}
