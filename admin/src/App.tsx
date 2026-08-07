import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Box,
  FolderTree,
  Gift,
  LogOut,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Star,
  Users,
} from 'lucide-react';
import { get, hasAdminSession, patch, post, remove, setTokens } from './api';
type Tab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'returns'
  | 'coupons'
  | 'customers'
  | 'reviews'
  | 'reports';
const tabs: [Tab, string, typeof Box][] = [
  ['dashboard', 'Dashboard', BarChart3],
  ['products', 'Products & stock', Box],
  ['categories', 'Categories', FolderTree],
  ['orders', 'Orders', ShoppingBag],
  ['returns', 'Returns & refunds', RotateCcw],
  ['coupons', 'Coupons', Gift],
  ['customers', 'Customers', Users],
  ['reviews', 'Reviews', Star],
  ['reports', 'Sales reports', PackageCheck],
];
const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
type AdminOrderStatus = (typeof orderStatuses)[number];
type AdminOrderDetails = {
  carrier?: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  cancellationReason?: string;
};
const orderTransitions: Partial<Record<string, AdminOrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};
const returnStatuses = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PICKUP_SCHEDULED',
  'RECEIVED',
  'REFUNDED',
] as const;
type AdminReturnStatus = (typeof returnStatuses)[number];
const returnTransitions: Record<AdminReturnStatus, AdminReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'RECEIVED'],
  REJECTED: [],
  PICKUP_SCHEDULED: ['RECEIVED'],
  RECEIVED: ['REFUNDED'],
  REFUNDED: [],
};
const orderStatusMessages: Record<AdminOrderStatus, string> = {
  PENDING: 'Order is awaiting confirmation.',
  CONFIRMED: 'Order was confirmed by the fulfilment team.',
  PROCESSING: 'Items are being packed and prepared for dispatch.',
  SHIPPED: 'Package was handed to the delivery partner.',
  DELIVERED: 'Package was delivered successfully.',
  CANCELLED: 'Order was cancelled by an administrator.',
};
const money = (n: unknown) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const Field = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <label>
    {label}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} />
  </label>
);
function Login({ done }: { done: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await post<{
        accessToken: string;
        refreshToken: string;
        user: { role: string };
      }>('/auth/login', { email, password });
      if (result.user.role !== 'ADMIN')
        throw new Error('This account is not an administrator.');
      setTokens(result.accessToken, result.refreshToken);
      done();
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Login failed');
    }
  };
  return (
    <main className="login">
      <form onSubmit={submit}>
        <span className="brand">CARTLY</span>
        <h1>Admin control centre</h1>
        <p>Use an administrator account.</p>
        <Field label="Email" value={email} onChange={setEmail} />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
        />
        {error && <div className="error">{error}</div>}
        <button>Sign in securely</button>
      </form>
    </main>
  );
}
function Table({
  rows,
  actions,
}: {
  rows: Record<string, unknown>[];
  actions?: (row: Record<string, unknown>) => React.ReactNode;
}) {
  if (!rows.length) return <div className="empty">No records found.</div>;
  const keys = Object.keys(rows[0]!)
    .filter(
      k =>
        ![
          'id',
          'databaseId',
          'items',
          'variants',
          'images',
          'timeline',
          'user',
          'product',
          'order',
          '_count',
        ].includes(k),
    )
    .slice(0, 6);
  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k}>{k.replaceAll(/([A-Z])/g, ' $1')}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)}>
              {keys.map((k, keyIndex) => (
                <td key={k}>
                  {keyIndex === 0 &&
                    [
                      'APPROVED',
                      'PICKUP_SCHEDULED',
                      'RECEIVED',
                      'REFUNDED',
                    ].includes(String(row.status)) && (
                      <span className="row-result approved" title="Approved">
                        ✓
                      </span>
                    )}
                  {keyIndex === 0 && row.status === 'REJECTED' && (
                    <span className="row-result rejected" title="Rejected">
                      ×
                    </span>
                  )}
                  {k === 'status' ? (
                    <span
                      className={`status-pill status-${String(row[k])
                        .toLowerCase()
                        .replaceAll('_', '-')}`}
                    >
                      {String(row[k]).replaceAll('_', ' ')}
                    </span>
                  ) : typeof row[k] === 'boolean' ? (
                    row[k] ? (
                      'Yes'
                    ) : (
                      'No'
                    )
                  ) : typeof row[k] === 'object' ? (
                    JSON.stringify(row[k])
                  ) : (
                    String(row[k] ?? '—')
                  )}
                </td>
              ))}
              {actions && <td>{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function App() {
  const [ready, setReady] = useState(hasAdminSession());
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<
    Record<string, unknown> | Record<string, unknown>[] | null
  >(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const endpoints: Record<Tab, string> = {
    dashboard: '/admin/dashboard',
    products: '/admin/products',
    categories: '/admin/categories',
    orders: '/admin/orders',
    returns: '/admin/returns',
    coupons: '/admin/coupons',
    customers: '/admin/customers',
    reviews: '/admin/reviews',
    reports: '/admin/reports/sales',
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await get(endpoints[tab]));
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [tab]);
  useEffect(() => {
    if (ready) load();
  }, [load, ready]);
  useEffect(() => {
    const handleExpiredSession = () => setReady(false);
    window.addEventListener('cartly-admin-expired', handleExpiredSession);
    return () =>
      window.removeEventListener('cartly-admin-expired', handleExpiredSession);
  }, []);
  if (!ready) return <Login done={() => setReady(true)} />;
  const rows = Array.isArray(data)
    ? data
    : data && 'daily' in data
    ? (data.daily as Record<string, unknown>[])
    : [];
  const action = async (
    row: Record<string, unknown>,
    kind: string,
    nextOrderStatus?: AdminOrderStatus,
    nextReturnStatus?: AdminReturnStatus,
    orderDetails: AdminOrderDetails = {},
  ) => {
    try {
      if (kind === 'toggle-user')
        await patch(`/admin/customers/${row.id}`, { active: !row.active });
      if (kind === 'delete-review') await remove(`/admin/reviews/${row.id}`);
      if (kind === 'disable-product') await remove(`/admin/products/${row.id}`);
      if (kind === 'approve' || kind === 'reject')
        await patch(`/admin/returns/${row.id}/review`, {
          approve: kind === 'approve',
          note: `${kind}d by administrator`,
        });
      if (kind === 'order-status' && nextOrderStatus)
        await patch(`/admin/orders/${row.id}/status`, {
          status: nextOrderStatus,
          message: orderStatusMessages[nextOrderStatus],
          ...orderDetails,
        });
      if (kind === 'return-status' && nextReturnStatus)
        await patch(`/admin/returns/${row.id}/status`, {
          status: nextReturnStatus,
          note: `Return updated to ${nextReturnStatus
            .toLowerCase()
            .replaceAll('_', ' ')} by administrator.`,
        });
      await load();
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Action failed');
    }
  };
  return (
    <div className="shell">
      <aside>
        <div className="logo">
          C<span>Admin</span>
        </div>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
              key={id}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <button
          className="logout"
          onClick={() => {
            const confirmed = window.confirm(
              'Are you sure you want to sign out?',
            );
            if (!confirmed) return;
            setTokens('', '');
            setReady(false);
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <main>
        <header>
          <div>
            <p>STORE OPERATIONS</p>
            <h1>{tabs.find(x => x[0] === tab)?.[1]}</h1>
          </div>
          <button className="refresh" onClick={load}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="loading">Loading live store data…</div>
        ) : tab === 'dashboard' && data && !Array.isArray(data) ? (
          <>
            <div className="stats">
              {[
                'revenue',
                'orders',
                'todayOrders',
                'customers',
                'products',
                'pendingReturns',
              ].map(key => (
                <article key={key}>
                  <span>{key.replaceAll(/([A-Z])/g, ' $1')}</span>
                  <strong>
                    {key === 'revenue'
                      ? money(data[key])
                      : String(data[key] ?? 0)}
                  </strong>
                </article>
              ))}
            </div>
            <section>
              <h2>Low-stock variants</h2>
              <Table
                rows={(data.lowStock as Record<string, unknown>[]) ?? []}
              />
            </section>
          </>
        ) : (
          <section>
            <div className="section-head">
              <div>
                <h2>Live management</h2>
                <p>
                  Changes are applied directly to PostgreSQL through
                  administrator-only APIs.
                </p>
              </div>
              {['products', 'categories', 'coupons'].includes(tab) && (
                <button
                  onClick={() =>
                    alert(
                      'Use the API-backed creation form in the next panel iteration; editing and operational actions are active now.',
                    )
                  }
                >
                  + New record
                </button>
              )}
            </div>
            <Table
              rows={rows}
              actions={row => (
                <div className="actions">
                  {tab === 'customers' && (
                    <button onClick={() => action(row, 'toggle-user')}>
                      {row.active ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                  {tab === 'reviews' && (
                    <button
                      className="danger"
                      onClick={() => action(row, 'delete-review')}
                    >
                      Remove
                    </button>
                  )}
                  {tab === 'products' && (
                    <button
                      className="danger"
                      onClick={() => action(row, 'disable-product')}
                    >
                      Disable
                    </button>
                  )}
                  {tab === 'returns' && (
                    <>
                      {row.status === 'REQUESTED' ? (
                        <>
                          <button onClick={() => action(row, 'approve')}>
                            Approve
                          </button>
                          <button
                            className="danger"
                            onClick={() => action(row, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <label className="status-control return-status-control">
                          <span className="sr-only">Change return status</span>
                          <select
                            aria-label={`Change return status for ${String(
                              row.id,
                            )}`}
                            disabled={
                              row.status === 'REJECTED' ||
                              row.status === 'REFUNDED'
                            }
                            onChange={event => {
                              const nextStatus = event.target
                                .value as AdminReturnStatus;
                              if (nextStatus === row.status) return;
                              const confirmed = window.confirm(
                                `Change this return from ${String(
                                  row.status,
                                ).replaceAll(
                                  '_',
                                  ' ',
                                )} to ${nextStatus.replaceAll('_', ' ')}?`,
                              );
                              if (confirmed)
                                void action(
                                  row,
                                  'return-status',
                                  undefined,
                                  nextStatus,
                                );
                            }}
                            value={String(row.status)}
                          >
                            {returnStatuses.map(status => (
                              <option
                                disabled={
                                  status !== row.status &&
                                  !returnTransitions[
                                    row.status as AdminReturnStatus
                                  ]?.includes(status)
                                }
                                key={status}
                                value={status}
                              >
                                {status.replaceAll('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                  {tab === 'orders' && (
                    <>
                      {row.status === 'RETURN_REQUESTED' ? (
                        <button onClick={() => setTab('returns')}>
                          Manage return
                        </button>
                      ) : row.status === 'RETURNED' ? (
                        <span className="flow-complete">
                          ✓ Return completed
                        </span>
                      ) : row.status === 'DELIVERED' ? (
                        <span className="flow-complete">✓ Delivered</span>
                      ) : row.status === 'CANCELLED' ? (
                        <span className="flow-cancelled">× Cancelled</span>
                      ) : (
                        <label className="status-control">
                          <span className="sr-only">Update order status</span>
                          <select
                            aria-label={`Update status for order ${String(
                              row.number ?? row.id,
                            )}`}
                            onChange={event => {
                              if (!event.target.value) return;
                              const nextStatus = event.target
                                .value as AdminOrderStatus;
                              const orderDetails: AdminOrderDetails = {};
                              if (nextStatus === 'SHIPPED') {
                                const carrier = window.prompt(
                                  'Delivery carrier name (for example: Blue Dart)',
                                );
                                if (!carrier) return;
                                const trackingNumber = window.prompt(
                                  'Shipment tracking number',
                                );
                                if (!trackingNumber) return;
                                const estimate = window.prompt(
                                  'Estimated delivery date (YYYY-MM-DD)',
                                );
                                orderDetails.carrier = carrier;
                                orderDetails.trackingNumber = trackingNumber;
                                if (estimate)
                                  orderDetails.estimatedDeliveryAt = new Date(
                                    `${estimate}T18:00:00`,
                                  ).toISOString();
                              }
                              if (nextStatus === 'CANCELLED') {
                                const reason = window.prompt(
                                  'Reason for cancelling this order',
                                );
                                if (!reason) return;
                                orderDetails.cancellationReason = reason;
                              }
                              const confirmed = window.confirm(
                                `Move ${String(
                                  row.number ?? 'this order',
                                )} from ${String(row.status).replaceAll(
                                  '_',
                                  ' ',
                                )} to ${nextStatus.replaceAll('_', ' ')}?${
                                  nextStatus === 'CANCELLED'
                                    ? ' Inventory will be restored.'
                                    : ''
                                }`,
                              );
                              if (confirmed)
                                void action(
                                  row,
                                  'order-status',
                                  nextStatus,
                                  undefined,
                                  orderDetails,
                                );
                            }}
                            value=""
                          >
                            <option value="">Update status…</option>
                            {(orderTransitions[String(row.status)] ?? []).map(
                              status => (
                                <option key={status} value={status}>
                                  {status.replaceAll('_', ' ')}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}
            />
            {tab === 'reports' && data && !Array.isArray(data) && (
              <div className="stats report">
                {Object.entries(data.summary as Record<string, unknown>).map(
                  ([k, v]) => (
                    <article key={k}>
                      <span>{k}</span>
                      <strong>
                        {k === 'revenue' || k === 'discounts' || k === 'tax'
                          ? money(v)
                          : String(v)}
                      </strong>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
