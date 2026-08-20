import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import ErrorPage from '../pages/ErrorPage';
import NotFoundPage from '../pages/NotFoundPage';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import CategoriesPage from '../pages/CategoriesPage';
import OrdersPage from '../pages/OrdersPage';
import ReturnsPage from '../pages/ReturnsPage';
import CouponsPage from '../pages/CouponsPage';
import CustomersPage from '../pages/CustomersPage';
import ReviewsPage from '../pages/ReviewsPage';
import ReportsPage from '../pages/ReportsPage';

export const createAdminRouter = (onSignOut: () => void) =>
  createBrowserRouter([
    {
      path: '/',
      element: <AdminLayout onSignOut={onSignOut} />,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'products', element: <ProductsPage /> },
        { path: 'categories', element: <CategoriesPage /> },
        { path: 'orders', element: <OrdersPage /> },
        { path: 'returns', element: <ReturnsPage /> },
        { path: 'coupons', element: <CouponsPage /> },
        { path: 'customers', element: <CustomersPage /> },
        { path: 'reviews', element: <ReviewsPage /> },
        { path: 'reports', element: <ReportsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
