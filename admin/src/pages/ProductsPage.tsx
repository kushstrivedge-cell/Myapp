import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, Plus, Trash2, Upload, X } from 'lucide-react';
import { get, patch, post } from '../api';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import SearchInput from '../components/SearchInput';
import Skeleton from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import Toast, { ToastMessage } from '../components/Toast';
type Variant = {
  id?: string;
  sku: string;
  colour: string | null;
  size: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
};
type Image = { id?: string; url: string; alt: string | null; position: number };
type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  updatedAt: string;
  categoryId: string;
  category: Category;
  variants: Variant[];
  images: Image[];
};
type Form = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  active: boolean;
  variants: Variant[];
  images: Image[];
};
const empty = (categoryId = ''): Form => ({
  name: '',
  slug: '',
  description: '',
  categoryId,
  active: true,
  variants: [
    { sku: '', colour: '', size: '', price: 0, oldPrice: null, stock: 0 },
  ],
  images: [],
});
const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    v,
  );
const origin = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'
).replace(/\/api\/v1\/?$/, '');
const imageUrl = (url?: string) =>
  url?.startsWith('/') ? `${origin}${url}` : url;
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [state, setState] = useState('all'),
    [stock, setStock] = useState('all'),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [form, setForm] = useState<Form | null>(null),
    [editing, setEditing] = useState<Product | null>(null),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [preview, setPreview] = useState<Product | null>(null),
    [toast, setToast] = useState<ToastMessage | null>(null),
    [discardOpen, setDiscardOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        get<Product[]>('/admin/products'),
        get<Category[]>('/admin/categories'),
      ]);
      setProducts(p);
      setCategories(c);
      const params = new URLSearchParams(location.search);
      const id = params.get('edit');
      if (id) {
        const item = p.find(x => x.id === id);
        if (item) openEdit(item);
      } else if (params.get('create')) openCreate(c[0]?.id ?? '');
    } catch (e) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Could not load products',
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);
  function openCreate(categoryId = '') {
    setEditing(null);
    setForm(empty(categoryId));
    setDirty(false);
  }
  function openEdit(item: Product) {
    setEditing(item);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description,
      categoryId: item.categoryId,
      active: item.active,
      variants: item.variants.map(v => ({ ...v })),
      images: item.images.map(i => ({ ...i })),
    });
    setDirty(false);
  }
  function closeNow() {
    setDirty(false);
    setForm(null);
    setEditing(null);
    setDiscardOpen(false);
    history.replaceState({}, '', location.pathname);
  }
  function close() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    closeNow();
  }
  function update(next: Partial<Form>) {
    setForm(value => (value ? { ...value, ...next } : value));
    setDirty(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (editing) {
        await patch(`/admin/products/${editing.id}`, {
          name: form.name,
          slug: form.slug,
          description: form.description,
          categoryId: form.categoryId,
          active: form.active,
          images: form.images.map((image, position) => ({
            url: image.url,
            alt: image.alt,
            position,
          })),
        });
        await Promise.all(
          form.variants
            .filter(v => v.id)
            .map(v =>
              patch(`/admin/variants/${v.id}`, {
                price: Number(v.price),
                oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
                stock: Number(v.stock),
              }),
            ),
        );
      } else
        await post('/admin/products', {
          ...form,
          variants: form.variants.map(v => ({
            ...v,
            price: Number(v.price),
            oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
            stock: Number(v.stock),
          })),
          images: form.images.map((i, index) => ({ ...i, position: index })),
        });
      setToast({
        kind: 'success',
        text: editing ? 'Product updated' : 'Product created',
      });
      setDirty(false);
      setForm(null);
      setEditing(null);
      await load();
    } catch (error) {
      setToast({
        kind: 'error',
        text:
          error instanceof Error ? error.message : 'Product could not be saved',
      });
    } finally {
      setSaving(false);
    }
  }
  const filtered = useMemo(
    () =>
      products.filter(
        p =>
          `${p.name} ${p.slug} ${p.variants.map(v => v.sku).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (category === 'all' || p.categoryId === category) &&
          (state === 'all' || String(p.active) === state) &&
          {
            all: true,
            low: p.variants.some(v => v.stock > 0 && v.stock <= 5),
            out: p.variants.every(v => v.stock === 0),
            available: p.variants.some(v => v.stock > 5),
          }[stock as 'all' | 'low' | 'out' | 'available'],
      ),
    [products, query, category, state, stock],
  );
  async function bulk(active: boolean) {
    await Promise.all(
      [...selected].map(id => patch(`/admin/products/${id}`, { active })),
    );
    setSelected(new Set());
    setToast({
      kind: 'success',
      text: `${active ? 'Activated' : 'Deactivated'} ${selected.size} products`,
    });
    await load();
  }
  function exportCsv() {
    const lines = [
      'name,slug,category,sku,price,stock,active',
      ...products.flatMap(p =>
        p.variants.map(v =>
          [p.name, p.slug, p.category.name, v.sku, v.price, v.stock, p.active]
            .map(x => `"${String(x).replaceAll('"', '""')}"`)
            .join(','),
        ),
      ),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([lines.join('\n')], { type: 'text/csv' }),
    );
    a.download = 'cartly-products.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importCsv(file?: File) {
    if (!file) return;
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) throw new Error('The CSV file has no product rows');
      const parse = (line: string) => {
        const values: string[] = [];
        line.replace(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g, (_match, value) => {
          values.push(
            value.startsWith('"')
              ? value.slice(1, -1).replaceAll('""', '"')
              : value,
          );
          return '';
        });
        return values;
      };
      const headers = parse(rows[0]).map(value => value.trim().toLowerCase());
      const required = [
        'name',
        'slug',
        'category',
        'sku',
        'price',
        'stock',
        'active',
      ];
      if (required.some(header => !headers.includes(header)))
        throw new Error(`CSV columns must be: ${required.join(', ')}`);
      const records = rows.slice(1).map(line => {
        const values = parse(line);
        return Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? '']),
        );
      });
      const grouped = new Map<string, typeof records>();
      records.forEach(record =>
        grouped.set(record.slug, [...(grouped.get(record.slug) ?? []), record]),
      );
      for (const [, variants] of grouped) {
        const first = variants[0];
        const matchedCategory = categories.find(
          item => item.name.toLowerCase() === first.category.toLowerCase(),
        );
        if (!matchedCategory)
          throw new Error(`Unknown category: ${first.category}`);
        await post('/admin/products', {
          name: first.name,
          slug: first.slug,
          description: first.description || `Imported product: ${first.name}`,
          categoryId: matchedCategory.id,
          active: !['false', '0', 'no'].includes(first.active.toLowerCase()),
          images: [],
          variants: variants.map(record => ({
            sku: record.sku,
            colour: record.colour || null,
            size: record.size || null,
            price: Number(record.price),
            oldPrice: record.oldprice ? Number(record.oldprice) : null,
            stock: Number(record.stock),
          })),
        });
      }
      setToast({ kind: 'success', text: `Imported ${grouped.size} products` });
      await load();
    } catch (error) {
      setToast({
        kind: 'error',
        text: error instanceof Error ? error.message : 'CSV import failed',
      });
    }
  }
  return (
    <>
      <section>
        <div className="section-head">
          <div>
            <h2>Product catalogue</h2>
            <p>Create products, manage variants and monitor stock.</p>
          </div>
          <div className="toolbar">
            <Button variant="secondary" onClick={exportCsv}>
              <Download size={15} />
              Export CSV
            </Button>
            <label className="button button-secondary">
              <Upload size={15} />
              Import CSV
              <input
                hidden
                type="file"
                accept=".csv"
                onChange={event => {
                  void importCsv(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
            <Button onClick={() => openCreate(categories[0]?.id ?? '')}>
              <Plus size={15} />
              Add product
            </Button>
          </div>
        </div>
        <div className="product-filters">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search product, slug or SKU…"
          />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={state} onChange={e => setState(e.target.value)}>
            <option value="all">All states</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select value={stock} onChange={e => setStock(e.target.value)}>
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="available">Available</option>
          </select>
        </div>
        {selected.size > 0 && (
          <div className="bulk-bar">
            <strong>{selected.size} selected</strong>
            <Button variant="secondary" onClick={() => void bulk(true)}>
              Activate
            </Button>
            <Button variant="danger" onClick={() => void bulk(false)}>
              Deactivate
            </Button>
          </div>
        )}
        {loading ? (
          <Skeleton />
        ) : (
          <DataTable
            rows={filtered}
            columns={[
              {
                key: 'select',
                header: '',
                render: p => (
                  <input
                    aria-label={`Select ${p.name}`}
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={e =>
                      setSelected(value => {
                        const next = new Set(value);
                        e.target.checked ? next.add(p.id) : next.delete(p.id);
                        return next;
                      })
                    }
                  />
                ),
              },
              {
                key: 'image',
                header: 'Image',
                render: p =>
                  p.images[0] ? (
                    <img
                      className="product-thumb"
                      src={imageUrl(p.images[0].url)}
                      alt={p.images[0].alt ?? p.name}
                    />
                  ) : (
                    <div className="product-placeholder">{p.name[0]}</div>
                  ),
              },
              {
                key: 'product',
                header: 'Product',
                render: p => (
                  <>
                    <strong>{p.name}</strong>
                    <small>{p.slug}</small>
                  </>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: p => p.category.name,
              },
              {
                key: 'variants',
                header: 'Variants',
                render: p => p.variants.length,
              },
              {
                key: 'price',
                header: 'Price range',
                render: p => {
                  const values = p.variants.map(v => Number(v.price));
                  return `${money(Math.min(...values))} – ${money(
                    Math.max(...values),
                  )}`;
                },
              },
              {
                key: 'stock',
                header: 'Stock',
                render: p => {
                  const total = p.variants.reduce((s, v) => s + v.stock, 0);
                  return (
                    <strong
                      className={
                        total === 0
                          ? 'out-stock'
                          : total <= 5
                          ? 'low-stock'
                          : ''
                      }
                    >
                      {total}
                    </strong>
                  );
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: p => (
                  <StatusBadge value={p.active ? 'ACTIVE' : 'INACTIVE'} />
                ),
              },
              {
                key: 'updated',
                header: 'Updated',
                render: p => new Date(p.updatedAt).toLocaleDateString('en-IN'),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: p => (
                  <div className="row-actions">
                    <Button variant="secondary" onClick={() => setPreview(p)}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="secondary" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      variant={p.active ? 'danger' : 'secondary'}
                      onClick={() =>
                        void patch(`/admin/products/${p.id}`, {
                          active: !p.active,
                        }).then(load)
                      }
                    >
                      {p.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>
      {form && (
        <Drawer
          title={editing ? 'Edit product' : 'Create product'}
          onClose={close}
        >
          <ProductForm
            form={form}
            categories={categories}
            editing={Boolean(editing)}
            saving={saving}
            update={update}
            submit={save}
          />
        </Drawer>
      )}
      {preview && (
        <Drawer title="Product preview" onClose={() => setPreview(null)}>
          <div className="product-preview">
            {preview.images[0] && (
              <img src={imageUrl(preview.images[0].url)} alt={preview.name} />
            )}
            <h2>{preview.name}</h2>
            <p>{preview.description}</p>
            <StatusBadge value={preview.active ? 'ACTIVE' : 'INACTIVE'} />
            <h3>Variants</h3>
            {preview.variants.map(v => (
              <div key={v.sku}>
                {v.sku} · {money(v.price)} · {v.stock} in stock
              </div>
            ))}
          </div>
        </Drawer>
      )}
      {discardOpen && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          message="Your product edits have not been saved."
          onClose={() => setDiscardOpen(false)}
          onConfirm={closeNow}
        />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
function ProductForm({
  form,
  categories,
  editing,
  saving,
  update,
  submit,
}: {
  form: Form;
  categories: Category[];
  editing: boolean;
  saving: boolean;
  update: (v: Partial<Form>) => void;
  submit: (e: FormEvent) => void;
}) {
  const variant = (index: number, next: Partial<Variant>) =>
    update({
      variants: form.variants.map((v, i) =>
        i === index ? { ...v, ...next } : v,
      ),
    });
  return (
    <form className="product-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Name
          <input
            required
            minLength={2}
            value={form.name}
            onChange={e =>
              update({
                name: e.target.value,
                slug: editing
                  ? form.slug
                  : e.target.value
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-'),
              })
            }
          />
        </label>
        <label>
          Slug
          <input
            required
            pattern="[a-z0-9-]+"
            value={form.slug}
            onChange={e => update({ slug: e.target.value })}
          />
        </label>
        <label>
          Category
          <select
            required
            value={form.categoryId}
            onChange={e => update({ categoryId: e.target.value })}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Description
          <textarea
            required
            minLength={10}
            rows={4}
            value={form.description}
            onChange={e => update({ description: e.target.value })}
          />
        </label>
      </div>
      <div className="form-section">
        <div className="card-heading">
          <h3>Variants</h3>
          {!editing && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                update({
                  variants: [
                    ...form.variants,
                    {
                      sku: '',
                      colour: '',
                      size: '',
                      price: 0,
                      oldPrice: null,
                      stock: 0,
                    },
                  ],
                })
              }
            >
              Add variant
            </Button>
          )}
        </div>
        {form.variants.map((v, i) => (
          <div
            className={`variant-row ${
              !editing && form.variants.length > 1 ? 'has-remove' : ''
            }`}
            key={v.id ?? i}
          >
            {!editing && form.variants.length > 1 && (
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  update({
                    variants: form.variants.filter(
                      (_value, index) => index !== i,
                    ),
                  })
                }
              >
                <Trash2 size={14} /> Remove
              </Button>
            )}
            <label>
              SKU
              <input
                required
                disabled={editing}
                value={v.sku}
                onChange={e => variant(i, { sku: e.target.value })}
              />
            </label>
            <label>
              Colour
              <input
                value={v.colour ?? ''}
                onChange={e => variant(i, { colour: e.target.value })}
              />
            </label>
            <label>
              Size
              <input
                value={v.size ?? ''}
                onChange={e => variant(i, { size: e.target.value })}
              />
            </label>
            <label>
              Price
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={v.price}
                onChange={e => variant(i, { price: Number(e.target.value) })}
              />
            </label>
            <label>
              Old price
              <input
                min="0.01"
                step="0.01"
                type="number"
                value={v.oldPrice ?? ''}
                onChange={e =>
                  variant(i, {
                    oldPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label>
              Stock
              <input
                required
                min="0"
                type="number"
                value={v.stock}
                onChange={e => variant(i, { stock: Number(e.target.value) })}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="form-section">
        <div className="card-heading">
          <h3>Images</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              update({
                images: [
                  ...form.images,
                  { url: '', alt: form.name, position: form.images.length },
                ],
              })
            }
          >
            Add image URL
          </Button>
        </div>
        {form.images.map((img, i) => (
          <div className="image-field" key={img.id ?? i}>
            <label>
              Image URL
              <input
                required
                value={img.url}
                onChange={e =>
                  update({
                    images: form.images.map((value, index) =>
                      index === i ? { ...value, url: e.target.value } : value,
                    ),
                  })
                }
              />
            </label>
            {img.url && (
              <img src={imageUrl(img.url)} alt={img.alt ?? form.name} />
            )}
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                update({
                  images: form.images.filter((_value, index) => index !== i),
                })
              }
            >
              <X size={14} /> Remove
            </Button>
          </div>
        ))}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={form.active}
          onChange={e => update({ active: e.target.checked })}
        />
        Product is active
      </label>
      <div className="modal-actions">
        <Button busy={saving} type="submit">
          {editing ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
