import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, patch } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import Toast, { ToastMessage } from '../components/Toast';
type Item = {
  id: string;
  productName: string;
  variantDetails: unknown;
  unitPrice: number;
  quantity: number;
};
type Timeline = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
};
type Row = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingMethod: string;
  shippingAddress: Record<string, string>;
  total: number;
  createdAt: string;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  cancellationReason: string | null;
  user: { name: string; email: string };
  items: Item[];
  timeline: Timeline[];
};
const transitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};
const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    Number(v),
  );
export default function OrdersPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('ALL'),
    [payment, setPayment] = useState('ALL'),
    [method, setMethod] = useState('ALL'),
    [selected, setSelected] = useState<Row | null>(null),
    [updating, setUpdating] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/orders'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load orders',
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(
    () =>
      rows.filter(
        r =>
          `${r.number} ${r.user.name} ${r.user.email} ${r.trackingNumber ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === 'ALL' || r.status === status) &&
          (payment === 'ALL' || r.paymentStatus === payment) &&
          (method === 'ALL' || r.paymentMethod === method),
      ),
    [rows, query, status, payment, method],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    visible = filtered.slice((page - 1) * 20, page * 20);
  function exportCsv() {
    const values = [
      [
        'Order',
        'Customer',
        'Email',
        'Date',
        'Items',
        'Total',
        'Payment',
        'Fulfilment',
      ],
      ...filtered.map(r => [
        r.number,
        r.user.name,
        r.user.email,
        r.createdAt,
        String(r.items.length),
        String(r.total),
        r.paymentStatus,
        r.status,
      ]),
    ];
    const blob = new Blob(
      [
        values
          .map(x =>
            x.map(v => `"${String(v).replaceAll('"', '""')}"`).join(','),
          )
          .join('\n'),
      ],
      { type: 'text/csv' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cartly-orders.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function update(data: object) {
    if (!updating) return;
    setBusy(true);
    try {
      await patch(`/admin/orders/${updating.id}/status`, data);
      setToast({ kind: 'success', text: 'Order status updated' });
      setUpdating(null);
      setSelected(null);
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Update failed',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Order management</h2>
          <p>Review fulfilment, payment, shipping and customer history.</p>
        </div>
        <div className="row-actions">
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button busy={loading} onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Order, customer, email or tracking"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <Filter
          label="Fulfilment"
          value={status}
          set={setStatus}
          values={[
            'ALL',
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'CANCELLED',
            'RETURN_REQUESTED',
            'RETURNED',
          ]}
        />
        <Filter
          label="Payment"
          value={payment}
          set={setPayment}
          values={[
            'ALL',
            'PENDING',
            'PAID',
            'FAILED',
            'REFUNDED',
            'PARTIALLY_REFUNDED',
          ]}
        />
        <Filter
          label="Method"
          value={method}
          set={setMethod}
          values={['ALL', ...new Set(rows.map(r => r.paymentMethod))]}
        />
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Orders"
          rows={visible}
          columns={[
            {
              key: 'order',
              header: 'Order',
              sortValue: r => r.number,
              render: r => (
                <button className="text-button" onClick={() => setSelected(r)}>
                  <strong>{r.number}</strong>
                </button>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              render: r => (
                <>
                  {r.user.name}
                  <small>{r.user.email}</small>
                </>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              sortValue: r => r.createdAt,
              render: r => new Date(r.createdAt).toLocaleDateString('en-IN'),
            },
            {
              key: 'items',
              header: 'Items',
              numeric: true,
              render: r => r.items.reduce((n, i) => n + i.quantity, 0),
            },
            {
              key: 'total',
              header: 'Total',
              numeric: true,
              sortValue: r => Number(r.total),
              render: r => money(r.total),
            },
            {
              key: 'payment',
              header: 'Payment',
              render: r => (
                <>
                  <StatusBadge value={r.paymentStatus} />
                  <small>{r.paymentMethod.toUpperCase()}</small>
                </>
              ),
            },
            {
              key: 'status',
              header: 'Fulfilment',
              render: r => <StatusBadge value={r.status} />,
            },
            {
              key: 'action',
              header: 'Action',
              render: r => (
                <Button variant="secondary" onClick={() => setSelected(r)}>
                  View details
                </Button>
              ),
            },
          ]}
        />
      )}
      <Pagination page={page} pages={pages} onChange={setPage} />
      {selected && (
        <OrderDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => setUpdating(selected)}
        />
      )}{' '}
      {updating && (
        <StatusForm
          row={updating}
          busy={busy}
          onClose={() => setUpdating(null)}
          onSave={update}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function Filter({
  label,
  value,
  set,
  values,
}: {
  label: string;
  value: string;
  set: (x: string) => void;
  values: string[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => set(e.target.value)}
    >
      {values.map(x => (
        <option key={x} value={x}>
          {x.replaceAll('_', ' ')}
        </option>
      ))}
    </select>
  );
}
function OrderDrawer({
  row,
  onClose,
  onUpdate,
}: {
  row: Row;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const address = Object.values(row.shippingAddress ?? {})
    .filter(Boolean)
    .join(', ');
  return (
    <Drawer title={`Order ${row.number}`} onClose={onClose}>
      <div className="detail-actions">
        <Button
          variant="secondary"
          onClick={() => void navigator.clipboard.writeText(row.number)}
        >
          Copy order ID
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Print invoice
        </Button>
        {(transitions[row.status] ?? []).length > 0 && (
          <Button onClick={onUpdate}>Update status</Button>
        )}
      </div>
      <div className="detail-grid">
        <article>
          <h3>Customer</h3>
          <strong>{row.user.name}</strong>
          <p>{row.user.email}</p>
          <p>{address}</p>
        </article>
        <article>
          <h3>Payment</h3>
          <StatusBadge value={row.paymentStatus} />
          <p>{row.paymentMethod.toUpperCase()}</p>
          <strong>{money(row.total)}</strong>
        </article>
        <article>
          <h3>Shipping</h3>
          <p>{row.shippingMethod}</p>
          <p>{row.carrier ?? 'Carrier not assigned'}</p>
          {row.trackingNumber && (
            <p>
              <strong>{row.trackingNumber}</strong>{' '}
              <button
                className="text-button"
                onClick={() =>
                  void navigator.clipboard.writeText(row.trackingNumber!)
                }
              >
                Copy
              </button>
            </p>
          )}
          <p>
            {row.estimatedDeliveryAt
              ? `Expected ${new Date(
                  row.estimatedDeliveryAt,
                ).toLocaleDateString('en-IN')}`
              : 'ETA not assigned'}
          </p>
        </article>
      </div>
      <h3>Items</h3>
      <div className="item-list">
        {row.items.map(item => (
          <div key={item.id}>
            <span>
              <strong>{item.productName}</strong>
              <small>Quantity {item.quantity}</small>
            </span>
            <strong>{money(Number(item.unitPrice) * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <h3>Order timeline</h3>
      <ol className="timeline">
        {row.timeline.map(event => (
          <li key={event.id}>
            <StatusBadge value={event.status} />
            <p>{event.message}</p>
            <small>{new Date(event.createdAt).toLocaleString('en-IN')}</small>
          </li>
        ))}
      </ol>
    </Drawer>
  );
}
function StatusForm({
  row,
  busy,
  onClose,
  onSave,
}: {
  row: Row;
  busy: boolean;
  onClose: () => void;
  onSave: (x: object) => void;
}) {
  const [status, setStatus] = useState(
      (transitions[row.status] ?? [])[0] ?? '',
    ),
    [message, setMessage] = useState(''),
    [carrier, setCarrier] = useState(row.carrier ?? ''),
    [tracking, setTracking] = useState(row.trackingNumber ?? ''),
    [eta, setEta] = useState(''),
    [reason, setReason] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      status,
      message,
      carrier: carrier || undefined,
      trackingNumber: tracking || undefined,
      estimatedDeliveryAt: eta ? new Date(eta).toISOString() : undefined,
      cancellationReason: reason || undefined,
    });
  }
  return (
    <Modal title={`Update ${row.number}`} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>
          Next status <span>*</span>
        </label>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {(transitions[row.status] ?? []).map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
        {status === 'SHIPPED' && (
          <>
            <label>
              Carrier <span>*</span>
            </label>
            <select
              required
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
            >
              <option value="">Select carrier</option>
              {[
                'Blue Dart',
                'Delhivery',
                'DTDC',
                'Ecom Express',
                'India Post',
              ].map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <label>
              Tracking number <span>*</span>
            </label>
            <input
              required
              minLength={3}
              maxLength={100}
              value={tracking}
              onChange={e => setTracking(e.target.value)}
            />
            <label>
              Estimated delivery <span>*</span>
            </label>
            <input
              required
              type="date"
              value={eta}
              onChange={e => setEta(e.target.value)}
            />
          </>
        )}
        {status === 'CANCELLED' && (
          <>
            <label>
              Cancellation reason <span>*</span>
            </label>
            <textarea
              required
              minLength={3}
              maxLength={300}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </>
        )}
        <label>
          Customer-visible update <span>*</span>
        </label>
        <textarea
          required
          minLength={3}
          maxLength={300}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Explain this update clearly"
        />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit">
            Update order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
