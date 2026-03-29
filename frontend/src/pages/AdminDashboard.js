import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/lib/api';
import { AlertTriangle, LogOut, Moon, Sun, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const staleThresholdDays = 180;
  const staleDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - staleThresholdDays);
    return date;
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      const filteredUsers = res.data.filter((user) => user.role !== 'admin');
      setUsers(filteredUsers);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (value) => {
    if (!value) return 'Never logged in';
    const date = new Date(value);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isStale = (user) => {
    if (!user.lastLogin) return true;
    return new Date(user.lastLogin) < staleDate;
  };

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;
  const staleCount = users.filter((user) => isStale(user)).length;

  const handleLogout = () => {
    logout();
    navigate('/admin-login', { replace: true });
  };

  const handleDelete = async (userId) => {
    const selected = users.find((user) => user._id === userId);
    if (!selected) return;

    const confirmed = window.confirm(
      `Delete ${selected.username} (${selected.email})? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(userId);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user._id !== userId));
      setSuccess('User removed successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-800">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Admin console</p>
              <h1 className="mt-3 text-3xl font-bold">Manage Expirex users</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Review account activity, remove stale users, and keep the system healthy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Total users</p>
              <p className="mt-4 text-3xl font-semibold">{users.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Active</p>
              <p className="mt-4 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Inactive</p>
              <p className="mt-4 text-3xl font-semibold text-amber-600 dark:text-amber-400">{inactiveCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Stale</p>
              <p className="mt-4 text-3xl font-semibold text-rose-600 dark:text-rose-400">{staleCount}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
            {success}
          </div>
        )}

        {staleCount > 0 && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Stale accounts detected
            </div>
            <p className="mt-2">{staleCount} user(s) have not logged in for more than {staleThresholdDays} days.</p>
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">No users found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const stale = isStale(user);
                  return (
                    <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{user.email}</td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{user.username}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(user.lastLogin)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stale ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                          {stale ? 'Dormant' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id)}
                          disabled={deletingId === user._id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === user._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;