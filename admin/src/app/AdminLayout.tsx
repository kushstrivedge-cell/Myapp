import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Box,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Gift,
  LogOut,
  Menu,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Star,
  Users,
  X,
} from 'lucide-react';
import { get, setTokens } from '../api';

const primaryLinks = [
  ['/dashboard', 'Dashboard', BarChart3],
  ['/products', 'Products & stock', Box],
  ['/categories', 'Categories', FolderTree],
  ['/orders', 'Orders', ShoppingBag],
  ['/returns', 'Returns & refunds', RotateCcw],
  ['/coupons', 'Coupons', Gift],
  ['/customers', 'Customers', Users],
  ['/reviews', 'Reviews', Star],
] as const;
const reportingLinks = [['/reports', 'Sales reports', PackageCheck]] as const;
const links = [...primaryLinks, ...reportingLinks];
type Counts = {
  pendingOrders: number;
  pendingReturns: number;
  lowStock: number;
};
type Admin = { name: string; role: string; email: string };

export default function AdminLayout({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('cartly-admin-sidebar') === 'collapsed',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({
    pendingOrders: 0,
    pendingReturns: 0,
    lowStock: 0,
  });
  const [admin, setAdmin] = useState<Admin | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const current = links.find(([path]) => location.pathname.startsWith(path));
  const title = current?.[1] ?? 'Admin';
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const expired = () => onSignOut();
    window.addEventListener('cartly-admin-expired', expired);
    return () => window.removeEventListener('cartly-admin-expired', expired);
  }, [onSignOut]);
  useEffect(() => {
    void Promise.all([
      get<Admin>('/auth/me'),
      get<{ pendingReturns: number; lowStockCount: number }>(
        '/admin/dashboard',
      ),
      get<Array<{ status: string }>>('/admin/orders'),
    ]).then(([profile, dashboard, orders]) => {
      setAdmin(profile);
      setCounts({
        pendingOrders: orders.filter(order =>
          ['PENDING', 'CONFIRMED'].includes(order.status),
        ).length,
        pendingReturns: dashboard.pendingReturns,
        lowStock: dashboard.lowStockCount,
      });
    });
  }, []);
  const toggle = () =>
    setCollapsed(value => {
      const next = !value;
      localStorage.setItem(
        'cartly-admin-sidebar',
        next ? 'collapsed' : 'expanded',
      );
      return next;
    });
  const badge = (path: string) =>
    path === '/orders'
      ? counts.pendingOrders
      : path === '/returns'
      ? counts.pendingReturns
      : path === '/products'
      ? counts.lowStock
      : 0;
  const onNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [
      ...(navRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []),
    ];
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };
  const group = (
    items: typeof primaryLinks | typeof reportingLinks,
    label: string,
  ) => (
    <div className="nav-group">
      <span className="nav-group-label">{label}</span>
      {items.map(([path, text, Icon]) => (
        <NavLink
          key={path}
          to={path}
          title={collapsed ? text : undefined}
          aria-label={text}
        >
          <Icon size={18} />
          <span className="nav-text">{text}</span>
          {badge(path) > 0 && (
            <span className="nav-badge" aria-label={`${badge(path)} items`}>
              {badge(path) > 99 ? '99+' : badge(path)}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );
  return (
    <div
      className={`shell ${collapsed ? 'sidebar-collapsed' : ''} ${
        mobileOpen ? 'mobile-nav-open' : ''
      }`}
    >
      <button
        className="mobile-menu"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu />
      </button>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside>
        <div className="sidebar-top">
          <NavLink
            className="full-logo"
            to="/dashboard"
            aria-label="Cartly Admin"
          >
            <span className="cartly-mark">C</span>
            <span className="brand-copy">
              <b>CARTLY</b>
              <small>ADMIN</small>
            </span>
          </NavLink>
          <button
            className="sidebar-collapse-icon"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav
          aria-label="Admin navigation"
          ref={navRef}
          onKeyDown={onNavKeyDown}
        >
          {group(primaryLinks, 'OPERATIONS')}
          {group(reportingLinks, 'INSIGHTS')}
        </nav>
        <div className="sidebar-bottom">
          <div
            className="admin-identity"
            title={admin ? `${admin.name} · ${admin.role}` : 'Administrator'}
          >
            <span>{admin?.name?.[0]?.toUpperCase() ?? 'A'}</span>
            <div>
              <strong>{admin?.name ?? 'Administrator'}</strong>
              <small>{admin?.role ?? 'ADMIN'}</small>
            </div>
          </div>
          <button
            className="logout"
            onClick={() => {
              setTokens('', '');
              onSignOut();
            }}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut size={17} />
            <span className="nav-text">Sign out</span>
          </button>
        </div>
      </aside>
      <main id="main-content">
        <header>
          <div>
            <div className="breadcrumbs">
              <NavLink to="/dashboard">Admin</NavLink>
              <span>/</span>
              <span>{title}</span>
            </div>
            <p>STORE OPERATIONS</p>
            <h1>{title}</h1>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
