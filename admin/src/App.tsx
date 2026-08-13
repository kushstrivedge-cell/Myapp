import {useState} from 'react';
import {RouterProvider} from 'react-router-dom';
import {hasAdminSession} from './api';
import {createAdminRouter} from './app/router';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [authenticated, setAuthenticated] = useState(hasAdminSession());
  if (!authenticated) return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  return <RouterProvider router={createAdminRouter(() => setAuthenticated(false))} />;
}
