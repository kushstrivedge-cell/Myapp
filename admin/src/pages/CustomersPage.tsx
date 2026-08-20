import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, patch } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import Toast, { ToastMessage } from '../components/Toast';
type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  _count: { orders: number; reviews: number };
  addresses: Array<{
    id: string;
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    number: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
};
const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    Number(v),
  );
export default function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('ALL'),
    [selected, setSelected] = useState<Row | null>(null),
    [target, setTarget] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/customers'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load customers',
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      rows.filter(
        r =>
          `${r.name} ${r.email} ${r.phone ?? ''}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter === 'ALL' || (filter === 'ACTIVE') === r.active),
      ),
    [rows, query, filter],
  );
  async function change(reason: string) {
    if (!target) return;
    setBusy(true);
    try {
      await patch(`/admin/customers/${target.id}`, { active: !target.active });
      setToast({
        kind: 'success',
        text: target.active
          ? `Customer suspended: ${reason}`
          : 'Customer activated',
      });
      setTarget(null);
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
  function csv() {
    const values = [
      ['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Reviews', 'Status'],
      ...visible.map(r => [
        r.name,
        r.email,
        r.phone ?? '',
        r.createdAt,
        String(r._count.orders),
        String(r._count.reviews),
        r.active ? 'Active' : 'Suspended',
      ]),
    ];
    const b = new Blob([values.map(x => x.join(',')).join('\n')]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'cartly-customers.csv';
    a.click();
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Customers</h2>
          <p>Review customer activity before changing account access.</p>
        </div>
        <Button variant="secondary" onClick={csv}>
          Export CSV
        </Button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Name, email or phone"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option>ALL</option>
          <option>ACTIVE</option>
          <option>SUSPENDED</option>
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Customers"
          rows={visible}
          columns={[
            {
              key: 'customer',
              header: 'Customer',
              sortValue: r => r.name,
              render: r => (
                <button className="text-button" onClick={() => setSelected(r)}>
                  <strong>{r.name}</strong>
                </button>
              ),
            },
            {
              key: 'contact',
              header: 'Contact',
              render: r => (
                <>
                  {r.email}
                  <small>{r.phone ?? 'No phone'}</small>
                </>
              ),
            },
            {
              key: 'joined',
              header: 'Joined',
              sortValue: r => r.createdAt,
              render: r => new Date(r.createdAt).toLocaleDateString('en-IN'),
            },
            {
              key: 'orders',
              header: 'Orders',
              numeric: true,
              render: r => r._count.orders,
            },
            {
              key: 'reviews',
              header: 'Reviews',
              numeric: true,
              render: r => r._count.reviews,
            },
            {
              key: 'status',
              header: 'Status',
              render: r => (
                <StatusBadge value={r.active ? 'ACTIVE' : 'SUSPENDED'} />
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: r => (
                <Button variant="secondary" onClick={() => setSelected(r)}>
                  View details
                </Button>
              ),
            },
          ]}
        />
      )}{' '}
      {selected && (
        <Drawer title={selected.name} onClose={() => setSelected(null)}>
          <div className="detail-actions">
            <Button
              variant={selected.active ? 'danger' : 'primary'}
              onClick={() => setTarget(selected)}
            >
              {selected.active ? 'Suspend customer' : 'Activate customer'}
            </Button>
          </div>
          <div className="detail-grid">
            <article>
              <h3>Contact</h3>
              <p>{selected.email}</p>
              <p>{selected.phone ?? 'No phone'}</p>
            </article>
            <article>
              <h3>Activity</h3>
              <strong>{selected._count.orders} orders</strong>
              <p>{selected._count.reviews} reviews</p>
            </article>
            <article>
              <h3>Recent spend</h3>
              <strong>
                {money(
                  selected.orders.reduce((n, x) => n + Number(x.total), 0),
                )}
              </strong>
              <p>Across the latest {selected.orders.length} orders shown</p>
            </article>
          </div>
          <h3>Addresses</h3>
          <div className="item-list">
            {selected.addresses.length ? (
              selected.addresses.map(a => (
                <div key={a.id}>
                  <span>
                    <strong>
                      {a.fullName}
                      {a.isDefault ? ' · Default' : ''}
                    </strong>
                    <small>
                      {a.addressLine}, {a.city}, {a.state} {a.pincode}
                    </small>
                  </span>
                </div>
              ))
            ) : (
              <p className="empty">No saved addresses</p>
            )}
          </div>
          <h3>Recent orders</h3>
          <div className="item-list">
            {selected.orders.map(o => (
              <div key={o.id}>
                <span>
                  <strong>{o.number}</strong>
                  <small>
                    {new Date(o.createdAt).toLocaleDateString('en-IN')} ·{' '}
                    {o.status}
                  </small>
                </span>
                <strong>{money(o.total)}</strong>
              </div>
            ))}
          </div>
        </Drawer>
      )}{' '}
      {target && (
        <SuspendForm
          row={target}
          busy={busy}
          onClose={() => setTarget(null)}
          onSave={change}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function SuspendForm({
  row,
  busy,
  onClose,
  onSave,
}: {
  row: Row;
  busy: boolean;
  onClose: () => void;
  onSave: (x: string) => void;
}) {
  const [reason, setReason] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(reason);
  }
  return (
    <Modal
      title={row.active ? 'Suspend customer' : 'Activate customer'}
      onClose={onClose}
    >
      <form className="admin-form" onSubmit={submit}>
        {row.active ? (
          <>
            <div className="warning-box">
              Suspension immediately revokes all active sessions. The customer
              will be unable to sign in.
            </div>
            <label>
              Suspension reason <span>*</span>
            </label>
            <textarea
              required
              minLength={5}
              maxLength={300}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </>
        ) : (
          <p>Restore access for {row.name}?</p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            busy={busy}
            variant={row.active ? 'danger' : 'primary'}
            type="submit"
          >
            {row.active ? 'Suspend and revoke sessions' : 'Activate customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
