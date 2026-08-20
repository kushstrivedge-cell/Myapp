import { FormEvent, useEffect, useMemo, useState } from 'react';
import { get, patch, post, remove } from '../api';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Toast, { ToastMessage } from '../components/Toast';
type Row = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count: { products: number };
};
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export default function CategoriesPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [emptyOnly, setEmptyOnly] = useState(false),
    [editing, setEditing] = useState<Row | null | undefined>(),
    [deleting, setDeleting] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<ToastMessage | null>(null);
  const load = async () => {
    try {
      setRows(await get<Row[]>('/admin/categories'));
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load categories',
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
          (!query ||
            `${r.name} ${r.slug}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!emptyOnly || r._count.products === 0),
      ),
    [rows, query, emptyOnly],
  );
  async function save(data: {
    name: string;
    slug: string;
    parentId: string | null;
  }) {
    setBusy(true);
    try {
      editing
        ? await patch(`/admin/categories/${editing.id}`, data)
        : await post('/admin/categories', data);
      setEditing(undefined);
      setToast({
        kind: 'success',
        text: `Category ${editing ? 'updated' : 'created'}`,
      });
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not save category',
      });
    } finally {
      setBusy(false);
    }
  }
  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove(`/admin/categories/${deleting.id}`);
      setDeleting(null);
      setToast({ kind: 'success', text: 'Category removed' });
      await load();
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not remove category',
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-page">
      <div className="section-head">
        <div>
          <h2>Category hierarchy</h2>
          <p>Organise the catalogue and keep product dependencies visible.</p>
        </div>
        <Button onClick={() => setEditing(null)}>+ Create category</Button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          aria-label="Search categories"
          placeholder="Search name or slug"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <label className="check-filter">
          <input
            type="checkbox"
            checked={emptyOnly}
            onChange={e => setEmptyOnly(e.target.checked)}
          />{' '}
          Empty categories only
        </label>
        <Button variant="secondary" busy={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable
          caption="Categories"
          rows={visible}
          columns={[
            {
              key: 'name',
              header: 'Category',
              sortValue: r => r.name,
              render: r => (
                <strong>
                  {r.parentId ? '↳ ' : ''}
                  {r.name}
                </strong>
              ),
            },
            {
              key: 'slug',
              header: 'Slug',
              sortValue: r => r.slug,
              render: r => <code>{r.slug}</code>,
            },
            {
              key: 'parent',
              header: 'Parent',
              render: r =>
                rows.find(p => p.id === r.parentId)?.name ?? 'Top level',
            },
            {
              key: 'products',
              header: 'Products',
              numeric: true,
              sortValue: r => r._count.products,
              render: r => r._count.products,
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
                    variant="danger"
                    disabled={r._count.products > 0}
                    title={
                      r._count.products
                        ? 'Move products before deleting this category'
                        : 'Delete category'
                    }
                    onClick={() => setDeleting(r)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}{' '}
      {editing !== undefined && (
        <CategoryForm
          row={editing}
          categories={rows}
          busy={busy}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}{' '}
      {deleting && (
        <ConfirmDialog
          title="Delete category"
          message={`Delete “${deleting.name}”? This cannot be undone. Categories containing products cannot be deleted.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </section>
  );
}
function CategoryForm({
  row,
  categories,
  busy,
  onClose,
  onSave,
}: {
  row: Row | null;
  categories: Row[];
  busy: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    slug: string;
    parentId: string | null;
  }) => void;
}) {
  const [name, setName] = useState(row?.name ?? ''),
    [slug, setSlug] = useState(row?.slug ?? ''),
    [manualSlug, setManualSlug] = useState(Boolean(row)),
    [parentId, setParentId] = useState(row?.parentId ?? '');
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      slug: slugify(slug || name),
      parentId: parentId || null,
    });
  }
  return (
    <Modal title={row ? 'Edit category' : 'Create category'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        <label htmlFor="category-name">
          Name <span>*</span>
        </label>
        <input
          id="category-name"
          maxLength={80}
          required
          value={name}
          onChange={e => {
            setName(e.target.value);
            if (!manualSlug) setSlug(slugify(e.target.value));
          }}
        />
        <label htmlFor="category-slug">
          Slug <span>*</span>
        </label>
        <input
          id="category-slug"
          pattern="[a-z0-9-]+"
          maxLength={100}
          required
          value={slug}
          onChange={e => {
            setManualSlug(true);
            setSlug(slugify(e.target.value));
          }}
        />
        <small>
          Used in catalogue URLs. Lowercase letters, numbers and hyphens only.
        </small>
        <label htmlFor="category-parent">Parent category</label>
        <select
          id="category-parent"
          value={parentId}
          onChange={e => setParentId(e.target.value)}
        >
          <option value="">Top level</option>
          {categories
            .filter(item => item.id !== row?.id)
            .map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit">
            {row ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
