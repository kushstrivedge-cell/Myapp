import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, remove } from '../api';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import Skeleton from '../components/Skeleton';
import Toast, { ToastMessage } from '../components/Toast';
type Row = {
  id: string;
  rating: number;
  title: string | null;
  text: string | null;
  createdAt: string;
  user: { name: string; email: string };
  product: { name: string };
};
export default function ReviewsPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [rating, setRating] = useState(0),
    [selected, setSelected] = useState<Row | null>(null),
    [target, setTarget] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/reviews'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load reviews',
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
            `${r.product.name} ${r.user.name} ${r.user.email} ${
              r.title ?? ''
            } ${r.text ?? ''}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (!rating || r.rating === rating),
        ),
      [rows, query, rating],
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 20)),
    visible = filtered.slice((page - 1) * 20, page * 20);
  async function moderate(reason: string) {
    if (!target) return;
    setBusy(true);
    try {
      await remove(`/admin/reviews/${target.id}`);
      setToast({ kind: 'success', text: `Review removed: ${reason}` });
      setTarget(null);
      setSelected(null);
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Removal failed',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Customer reviews</h2>
          <p>Inspect full review context before moderation.</p>
        </div>
        <Button busy={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          placeholder="Customer, product or review text"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          value={rating}
          onChange={e => setRating(Number(e.target.value))}
        >
          <option value="0">All ratings</option>
          {[5, 4, 3, 2, 1].map(x => (
            <option key={x} value={x}>
              {x} stars
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Customer reviews"
          rows={visible}
          columns={[
            {
              key: 'rating',
              header: 'Rating',
              numeric: true,
              sortValue: r => r.rating,
              render: r => (
                <span
                  className="stars"
                  aria-label={`${r.rating} out of 5 stars`}
                >
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </span>
              ),
            },
            { key: 'product', header: 'Product', render: r => r.product.name },
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
              key: 'review',
              header: 'Review',
              render: r => (
                <button
                  className="review-preview"
                  onClick={() => setSelected(r)}
                >
                  <strong>{r.title ?? 'Untitled review'}</strong>
                  <small>{r.text ?? 'No written feedback'}</small>
                </button>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              sortValue: r => r.createdAt,
              render: r => new Date(r.createdAt).toLocaleDateString('en-IN'),
            },
            {
              key: 'action',
              header: 'Action',
              render: r => (
                <Button variant="secondary" onClick={() => setSelected(r)}>
                  View
                </Button>
              ),
            },
          ]}
        />
      )}
      <Pagination page={page} pages={pages} onChange={setPage} />
      {selected && (
        <Modal
          title={selected.title ?? 'Review details'}
          onClose={() => setSelected(null)}
        >
          <div className="review-detail">
            <p className="stars">
              {'★'.repeat(selected.rating)}
              {'☆'.repeat(5 - selected.rating)}
            </p>
            <p>{selected.text ?? 'No written feedback was provided.'}</p>
            <dl>
              <dt>Product</dt>
              <dd>{selected.product.name}</dd>
              <dt>Customer</dt>
              <dd>
                {selected.user.name} · {selected.user.email}
              </dd>
              <dt>Submitted</dt>
              <dd>{new Date(selected.createdAt).toLocaleString('en-IN')}</dd>
            </dl>
            <div className="modal-actions">
              <Button variant="danger" onClick={() => setTarget(selected)}>
                Remove review
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {target && (
        <Moderate
          row={target}
          busy={busy}
          onClose={() => setTarget(null)}
          onSave={moderate}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function Moderate({
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
    <Modal title="Remove review" onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <p>
          This permanently removes {row.user.name}’s review of{' '}
          {row.product.name}.
        </p>
        <label>
          Moderation reason <span>*</span>
        </label>
        <textarea
          required
          minLength={5}
          maxLength={300}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} variant="danger" type="submit">
            Remove review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
