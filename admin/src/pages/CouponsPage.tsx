import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, patch, post } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import Toast, { ToastMessage } from '../components/Toast';
type Row = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  minimumCart: number | null;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
};
const money = (v: number | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    v ?? 0,
  );
const state = (r: Row) =>
  !r.active
    ? 'INACTIVE'
    : r.startsAt && new Date(r.startsAt) > new Date()
    ? 'UPCOMING'
    : r.expiresAt && new Date(r.expiresAt) < new Date()
    ? 'EXPIRED'
    : 'ACTIVE';
export default function CouponsPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState('ALL'),
    [query, setQuery] = useState(''),
    [editing, setEditing] = useState<Row | null | undefined>(),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/coupons'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load coupons',
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
          (filter === 'ALL' || state(r) === filter) &&
          r.code.includes(query.toUpperCase()),
      ),
    [rows, filter, query],
  );
  async function save(data: object) {
    setBusy(true);
    try {
      editing
        ? await patch(`/admin/coupons/${editing.id}`, data)
        : await post('/admin/coupons', data);
      setEditing(undefined);
      setToast({
        kind: 'success',
        text: `Coupon ${editing ? 'updated' : 'created'}`,
      });
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not save coupon',
      });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(r: Row) {
    setBusy(true);
    try {
      await patch(`/admin/coupons/${r.id}`, { active: !r.active });
      setToast({
        kind: 'success',
        text: r.active ? 'Coupon deactivated' : 'Coupon activated',
      });
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
          <h2>Coupons</h2>
          <p>
            Create controlled discounts without exposing conflicting values.
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>+ Create coupon</Button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Search coupon code"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          aria-label="Coupon status"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          {['ALL', 'ACTIVE', 'UPCOMING', 'EXPIRED', 'INACTIVE'].map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Coupons"
          rows={visible}
          columns={[
            {
              key: 'code',
              header: 'Code',
              sortValue: r => r.code,
              render: r => (
                <div className="copy-value">
                  <strong>{r.code}</strong>
                  <button
                    aria-label={`Copy ${r.code}`}
                    onClick={() => void navigator.clipboard.writeText(r.code)}
                  >
                    Copy
                  </button>
                </div>
              ),
            },
            {
              key: 'discount',
              header: 'Discount',
              render: r =>
                r.percentOff ? `${r.percentOff}%` : money(r.amountOff),
            },
            {
              key: 'minimum',
              header: 'Minimum cart',
              numeric: true,
              render: r => money(r.minimumCart),
            },
            {
              key: 'starts',
              header: 'Starts',
              render: r =>
                r.startsAt
                  ? new Date(r.startsAt).toLocaleDateString('en-IN')
                  : 'Immediately',
            },
            {
              key: 'expires',
              header: 'Expires',
              render: r =>
                r.expiresAt
                  ? new Date(r.expiresAt).toLocaleDateString('en-IN')
                  : 'No expiry',
            },
            {
              key: 'status',
              header: 'Status',
              render: r => <StatusBadge value={state(r)} />,
            },
            {
              key: 'actions',
              header: 'Actions',
              render: r => (
                <div className="row-actions">
                  <Button variant="secondary" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  <Button
                    variant="tertiary"
                    disabled={busy}
                    onClick={() => void toggle(r)}
                  >
                    {r.active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}{' '}
      {editing !== undefined && (
        <CouponForm
          row={editing}
          existing={rows}
          busy={busy}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function CouponForm({
  row,
  existing,
  busy,
  onClose,
  onSave,
}: {
  row: Row | null;
  existing: Row[];
  busy: boolean;
  onClose: () => void;
  onSave: (x: object) => void;
}) {
  const [code, setCode] = useState(row?.code ?? ''),
    [type, setType] = useState(row?.percentOff ? 'percent' : 'fixed'),
    [value, setValue] = useState(
      String(row?.percentOff ?? row?.amountOff ?? ''),
    ),
    [minimum, setMinimum] = useState(String(row?.minimumCart ?? '')),
    [starts, setStarts] = useState(row?.startsAt?.slice(0, 10) ?? ''),
    [expires, setExpires] = useState(row?.expiresAt?.slice(0, 10) ?? ''),
    [active, setActive] = useState(row?.active ?? true),
    duplicate = existing.some(
      x => x.id !== row?.id && x.code === code.trim().toUpperCase(),
    ),
    invalidDates = Boolean(starts && expires && starts > expires);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (duplicate || invalidDates) return;
    const amount = Number(value);
    onSave({
      code: code.trim().toUpperCase(),
      percentOff: type === 'percent' ? amount : null,
      amountOff: type === 'fixed' ? amount : null,
      minimumCart: minimum ? Number(minimum) : null,
      startsAt: starts ? new Date(starts).toISOString() : null,
      expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
      active,
    });
  }
  return (
    <Modal title={row ? 'Edit coupon' : 'Create coupon'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>
          Coupon code <span>*</span>
        </label>
        <input
          required
          minLength={2}
          maxLength={30}
          value={code}
          onChange={e =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
          }
        />
        {duplicate && (
          <small className="field-error">
            This coupon code already exists.
          </small>
        )}
        <fieldset>
          <legend>Discount type</legend>
          <label>
            <input
              type="radio"
              checked={type === 'percent'}
              onChange={() => setType('percent')}
            />{' '}
            Percentage
          </label>
          <label>
            <input
              type="radio"
              checked={type === 'fixed'}
              onChange={() => setType('fixed')}
            />{' '}
            Fixed amount
          </label>
        </fieldset>
        <label>
          {type === 'percent' ? 'Percentage' : 'Amount (INR)'} <span>*</span>
        </label>
        <input
          type="number"
          required
          min="1"
          max={type === 'percent' ? 100 : 999999}
          step={type === 'percent' ? 1 : 0.01}
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <label>Minimum cart (INR)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={minimum}
          onChange={e => setMinimum(e.target.value)}
        />
        <div className="form-grid">
          <label>
            Starts
            <input
              type="date"
              value={starts}
              onChange={e => setStarts(e.target.value)}
            />
          </label>
          <label>
            Expires
            <input
              type="date"
              value={expires}
              onChange={e => setExpires(e.target.value)}
            />
          </label>
        </div>
        {invalidDates && (
          <small className="field-error">
            End date must be after the start date.
          </small>
        )}
        <label className="check-filter">
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
          />{' '}
          Coupon is active
        </label>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            busy={busy}
            disabled={duplicate || invalidDates}
            type="submit"
          >
            Save coupon
          </Button>
        </div>
      </form>
    </Modal>
  );
}
