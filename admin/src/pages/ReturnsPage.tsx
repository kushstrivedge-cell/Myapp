import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, patch } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import Toast, { ToastMessage } from '../components/Toast';
type Event = { id: string; status: string; message: string; createdAt: string };
type Row = {
  id: string;
  status: string;
  refundStatus: string;
  reason: string;
  refundAmount: number;
  updatedAt: string;
  adminNote: string | null;
  pickupAt: string | null;
  user: { name: string; email: string };
  order: {
    id: string;
    number: string;
    paymentMethod: string;
    paymentStatus: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    refundAmount: number;
    orderItem: { productName: string; unitPrice: number };
  }>;
  events: Event[];
};
const next: Record<string, string[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKUP_SCHEDULED', 'RECEIVED'],
  PICKUP_SCHEDULED: ['RECEIVED'],
  RECEIVED: ['REFUNDED'],
};
const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    Number(v),
  );
export default function ReturnsPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('ALL'),
    [refund, setRefund] = useState('ALL'),
    [selected, setSelected] = useState<Row | null>(null),
    [workflow, setWorkflow] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/returns'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load returns',
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
          `${r.order.number} ${r.user.name} ${r.user.email} ${r.reason}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === 'ALL' || r.status === status) &&
          (refund === 'ALL' || r.refundStatus === refund),
      ),
    [rows, query, status, refund],
  );
  async function update(nextStatus: string, note: string) {
    if (!workflow) return;
    setBusy(true);
    try {
      await patch(`/admin/returns/${workflow.id}/status`, {
        status: nextStatus,
        note,
      });
      setToast({ kind: 'success', text: 'Return workflow updated' });
      setWorkflow(null);
      setSelected(null);
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Return update failed',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Returns and refunds</h2>
          <p>
            Review returned items and control each refund consequence
            explicitly.
          </p>
        </div>
        <Button busy={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Order, customer or reason"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option>ALL</option>
          {Object.keys(next).map(x => (
            <option key={x}>{x}</option>
          ))}
          <option>REJECTED</option>
          <option>REFUNDED</option>
        </select>
        <select value={refund} onChange={e => setRefund(e.target.value)}>
          <option>ALL</option>
          {[...new Set(rows.map(r => r.refundStatus))].map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Returns and refunds"
          rows={visible}
          columns={[
            {
              key: 'return',
              header: 'Return',
              render: r => (
                <button className="text-button" onClick={() => setSelected(r)}>
                  Return …{r.id.slice(-8)}
                </button>
              ),
            },
            {
              key: 'order',
              header: 'Order',
              render: r => <strong>{r.order.number}</strong>,
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
              key: 'items',
              header: 'Items',
              numeric: true,
              render: r => r.items.reduce((n, x) => n + x.quantity, 0),
            },
            { key: 'reason', header: 'Reason', render: r => r.reason },
            {
              key: 'status',
              header: 'Return status',
              render: r => <StatusBadge value={r.status} />,
            },
            {
              key: 'refund',
              header: 'Refund',
              numeric: true,
              render: r => (
                <>
                  <strong>{money(r.refundAmount)}</strong>
                  <small>{r.refundStatus.replaceAll('_', ' ')}</small>
                </>
              ),
            },
            {
              key: 'updated',
              header: 'Updated',
              render: r => new Date(r.updatedAt).toLocaleDateString('en-IN'),
            },
            {
              key: 'action',
              header: 'Action',
              render: r => (
                <Button variant="secondary" onClick={() => setSelected(r)}>
                  Review
                </Button>
              ),
            },
          ]}
        />
      )}{' '}
      {selected && (
        <Drawer
          title={`Return for ${selected.order.number}`}
          onClose={() => setSelected(null)}
        >
          <div className="detail-actions">
            {(next[selected.status] ?? []).length > 0 && (
              <Button onClick={() => setWorkflow(selected)}>
                Continue workflow
              </Button>
            )}
          </div>
          <div className="detail-grid">
            <article>
              <h3>Customer</h3>
              <strong>{selected.user.name}</strong>
              <p>{selected.user.email}</p>
            </article>
            <article>
              <h3>Refund</h3>
              <strong>{money(selected.refundAmount)}</strong>
              <p>
                {selected.order.paymentMethod.toUpperCase()} ·{' '}
                {selected.refundStatus.replaceAll('_', ' ')}
              </p>
            </article>
            <article>
              <h3>Request</h3>
              <StatusBadge value={selected.status} />
              <p>{selected.reason}</p>
              {selected.adminNote && <p>Admin note: {selected.adminNote}</p>}
            </article>
          </div>
          <h3>Returned products</h3>
          <div className="item-list">
            {selected.items.map(x => (
              <div key={x.id}>
                <span>
                  <strong>{x.orderItem.productName}</strong>
                  <small>Quantity {x.quantity}</small>
                </span>
                <strong>{money(x.refundAmount)}</strong>
              </div>
            ))}
          </div>
          <h3>Return timeline</h3>
          <ol className="timeline">
            {selected.events?.map(x => (
              <li key={x.id}>
                <StatusBadge value={x.status} />
                <p>{x.message}</p>
                <small>{new Date(x.createdAt).toLocaleString('en-IN')}</small>
              </li>
            ))}
          </ol>
        </Drawer>
      )}{' '}
      {workflow && (
        <Workflow
          row={workflow}
          busy={busy}
          onClose={() => setWorkflow(null)}
          onSave={update}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function Workflow({
  row,
  busy,
  onClose,
  onSave,
}: {
  row: Row;
  busy: boolean;
  onClose: () => void;
  onSave: (s: string, n: string) => void;
}) {
  const [status, setStatus] = useState((next[row.status] ?? [])[0] ?? ''),
    [note, setNote] = useState('');
  const rejecting = status === 'REJECTED',
    refunding = status === 'REFUNDED';
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave(status, note);
  }
  return (
    <Modal title="Update return workflow" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label>Next step</label>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {(next[row.status] ?? []).map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label>Administrator note {rejecting && <span>*</span>}</label>
        <textarea
          required={rejecting}
          minLength={rejecting ? 3 : 0}
          maxLength={500}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a meaningful inspection or decision note"
        />
        {refunding && (
          <div className="warning-box">
            Confirming this step completes a {money(row.refundAmount)} refund
            and marks the order returned.
          </div>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            busy={busy}
            variant={rejecting ? 'danger' : 'primary'}
            type="submit"
          >
            Confirm {status.replaceAll('_', ' ').toLowerCase()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
