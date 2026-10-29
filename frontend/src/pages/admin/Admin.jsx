import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  HandCoins,
  IndianRupee,
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertTriangle,
  X,
  Shield,
  Activity,
  Layers,
  Check,
} from 'lucide-react';
import { API_URL, getAuthHeaders } from '../../lib/apiConfig.js';
import './admin.css';

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'requests' | 'donations' | 'audit'

  // Overview stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users management state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });

  // Requests state
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reqStatusFilter, setReqStatusFilter] = useState('all');
  const [reqCategoryFilter, setReqCategoryFilter] = useState('all');
  const [reqSearch, setReqSearch] = useState('');
  const [reqPage, setReqPage] = useState(1);
  const [reqPagination, setReqPagination] = useState({ total: 0, totalPages: 1 });

  // Donations state
  const [donations, setDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [donationStatusFilter, setDonationStatusFilter] = useState('all');
  const [donationPage, setDonationPage] = useState(1);
  const [donationPagination, setDonationPagination] = useState({ total: 0, totalPages: 1 });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ total: 0, totalPages: 1 });

  // Modals state
  const [viewingUser, setViewingUser] = useState(null);
  const [userModalData, setUserModalData] = useState(null);
  const [loadingUserModal, setLoadingUserModal] = useState(false);

  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [newRole, setNewRole] = useState('farmer');

  const [statusConfirmUser, setStatusConfirmUser] = useState(null);

  const [viewingRequest, setViewingRequest] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  function showMessage(text, type = 'success') {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 4000);
  }

  // 1. Fetch Stats
  async function fetchStats() {
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  // 2. Fetch Users
  async function fetchUsers(
    page = userPage,
    role = userRoleFilter,
    status = userStatusFilter,
    search = userSearch
  ) {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (role && role !== 'all') params.set('role', role);
      if (status && status !== 'all') params.set('status', status);
      if (search && search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_URL}/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUserPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }

  // 3. Fetch Requests
  async function fetchRequests(
    page = reqPage,
    status = reqStatusFilter,
    category = reqCategoryFilter,
    search = reqSearch
  ) {
    try {
      setLoadingRequests(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (status && status !== 'all') params.set('status', status);
      if (category && category !== 'all') params.set('category', category);
      if (search && search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_URL}/api/admin/requests?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setReqPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }

  // 4. Fetch Donations
  async function fetchDonations(page = donationPage, status = donationStatusFilter) {
    try {
      setLoadingDonations(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (status && status !== 'all') params.set('status', status);

      const res = await fetch(`${API_URL}/api/admin/donations?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDonations(data.donations || []);
        setDonationPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoadingDonations(false);
    }
  }

  // 5. Fetch Audit Logs
  async function fetchAuditLogs(page = auditPage, action = auditActionFilter) {
    try {
      setLoadingAudit(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (action && action !== 'all') params.set('action', action);

      const res = await fetch(`${API_URL}/api/admin/audit-logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditPagination(data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  }

  // Load initial data
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch when tab switches
  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'users') fetchUsers(1);
    if (activeTab === 'requests') fetchRequests(1);
    if (activeTab === 'donations') fetchDonations(1);
    if (activeTab === 'audit') fetchAuditLogs(1);
  }, [activeTab]);

  // Load User Details Modal
  async function openUserDetails(userId) {
    setViewingUser(userId);
    setLoadingUserModal(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUserModalData(data);
      }
    } catch (err) {
      console.error('Error loading user modal details:', err);
    } finally {
      setLoadingUserModal(false);
    }
  }

  // Toggle user active status
  async function handleToggleStatus() {
    if (!statusConfirmUser) return;
    try {
      const nextStatus = !statusConfirmUser.isActive;
      const res = await fetch(`${API_URL}/api/admin/users/${statusConfirmUser.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || `User ${nextStatus ? 'activated' : 'deactivated'}`);
        setStatusConfirmUser(null);
        fetchUsers();
        fetchStats();
      } else {
        showMessage(data.message || 'Operation failed', 'error');
      }
    } catch (err) {
      showMessage('Network error while updating user status', 'error');
    }
  }

  // Change user role
  async function handleChangeRole() {
    if (!roleChangeUser) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${roleChangeUser.id}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'User role updated');
        setRoleChangeUser(null);
        fetchUsers();
        fetchStats();
      } else {
        showMessage(data.message || 'Operation failed', 'error');
      }
    } catch (err) {
      showMessage('Network error while changing role', 'error');
    }
  }

  // Override request status
  async function handleOverrideRequestStatus() {
    if (!viewingRequest || !overrideStatus) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/requests/${viewingRequest.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: overrideStatus,
          reviewNotes: overrideNotes,
          rejectionReason: overrideReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Request status updated successfully');
        setViewingRequest(null);
        fetchRequests();
        fetchStats();
      } else {
        showMessage(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      showMessage('Network error while overriding request', 'error');
    }
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div>
          <span className="eyebrow">
            <Shield size={14} />
            Administrator Control Center
          </span>
          <h1>Welcome, {user.name}</h1>
          <p>
            Global system governance, multi-role user directories, verified farmer request pipelines, and live Razorpay transactions.
          </p>
        </div>

        <div className="admin-header-actions">
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span>Production Core Active</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (activeTab === 'overview') fetchStats();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'requests') fetchRequests();
              if (activeTab === 'donations') fetchDonations();
              if (activeTab === 'audit') fetchAuditLogs();
              showMessage('System data refreshed');
            }}
          >
            <RefreshCw size={14} />
            Refresh Data
          </button>
        </div>
      </header>

      {/* Action Notification Alert */}
      {actionMessage.text && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '18px',
            fontSize: '13.5px',
            fontWeight: 600,
            background: actionMessage.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: actionMessage.type === 'error' ? '#dc2626' : '#15803d',
            border: `1px solid ${actionMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {actionMessage.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="admin-nav-tabs" aria-label="Admin Navigation Tabs">
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} />
          Overview & Metrics
        </button>
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          User Management
          {stats?.users?.total ? <span className="tab-badge">{stats.users.total}</span> : null}
        </button>
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Layers size={16} />
          Assistance Requests
          {stats?.requests?.total ? <span className="tab-badge">{stats.requests.total}</span> : null}
        </button>
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveTab('donations')}
        >
          <HandCoins size={16} />
          Donations & Razorpay Ledger
          {stats?.financials?.totalDonationsCount ? (
            <span className="tab-badge">{stats.financials.totalDonationsCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          className={`admin-nav-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Activity size={16} />
          System Audit Trail
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div>
          {/* Primary KPI Grid */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="admin-kpi-top">
                <span className="admin-kpi-title">Total Users</span>
                <span className="admin-kpi-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
                  <Users size={18} />
                </span>
              </div>
              <div className="admin-kpi-value">{loadingStats ? '—' : stats?.users?.total || 0}</div>
              <div className="admin-kpi-subtext">
                <span>{stats?.users?.farmers || 0} Farmers</span> •
                <span>{stats?.users?.donors || 0} Donors</span> •
                <span>{stats?.users?.verifiers || 0} Verifiers</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-top">
                <span className="admin-kpi-title">Verified Farmers</span>
                <span className="admin-kpi-icon" style={{ background: '#f0fdf4', color: '#166534' }}>
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <div className="admin-kpi-value">{loadingStats ? '—' : stats?.farmers?.verified || 0}</div>
              <div className="admin-kpi-subtext">
                <span style={{ color: '#d97706' }}>{stats?.farmers?.pending || 0} verification pending</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-top">
                <span className="admin-kpi-title">Total Assistance Requests</span>
                <span className="admin-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <Layers size={18} />
                </span>
              </div>
              <div className="admin-kpi-value">{loadingStats ? '—' : stats?.requests?.total || 0}</div>
              <div className="admin-kpi-subtext">
                <span style={{ color: '#15803d' }}>{stats?.requests?.approved || 0} Approved</span> •
                <span>{stats?.requests?.funded || 0} Funded</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="admin-kpi-top">
                <span className="admin-kpi-title">Funds Raised</span>
                <span className="admin-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <IndianRupee size={18} />
                </span>
              </div>
              <div className="admin-kpi-value" style={{ color: '#15803d' }}>
                ₹{loadingStats ? '—' : Number(stats?.financials?.totalFundsRaised || 0).toLocaleString()}
              </div>
              <div className="admin-kpi-subtext">
                <span>{stats?.financials?.completedDonationsCount || 0} transactions completed</span>
              </div>
            </div>
          </div>

          {/* Secondary Overview Breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* User Roles Breakdown */}
            <div className="admin-section">
              <h3 className="admin-section-title" style={{ marginBottom: '14px' }}>Platform Demographics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>Farmers</span>
                    <strong>{stats?.users?.farmers || 0}</strong>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: '#047857', height: '100%', width: `${stats?.users?.total ? ((stats.users.farmers / stats.users.total) * 100).toFixed(0) : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>Donors</span>
                    <strong>{stats?.users?.donors || 0}</strong>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: '#2563eb', height: '100%', width: `${stats?.users?.total ? ((stats.users.donors / stats.users.total) * 100).toFixed(0) : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>Field Verifiers</span>
                    <strong>{stats?.users?.verifiers || 0}</strong>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: '#a21caf', height: '100%', width: `${stats?.users?.total ? ((stats.users.verifiers / stats.users.total) * 100).toFixed(0) : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>System Administrators</span>
                    <strong>{stats?.users?.admins || 0}</strong>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ background: '#b91c1c', height: '100%', width: `${stats?.users?.total ? ((stats.users.admins / stats.users.total) * 100).toFixed(0) : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistance Requests Pipeline */}
            <div className="admin-section">
              <h3 className="admin-section-title" style={{ marginBottom: '14px' }}>Request Pipeline Health</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>SUBMITTED / PENDING</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e3a8a', marginTop: '4px' }}>
                    {stats?.requests?.submitted || 0}
                  </div>
                </div>
                <div style={{ background: '#fef3c7', padding: '14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>UNDER VERIFIER REVIEW</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#78350f', marginTop: '4px' }}>
                    {stats?.requests?.underReview || 0}
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>APPROVED & PUBLISHED</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                    {stats?.requests?.approved || 0}
                  </div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 700 }}>100% FULLY FUNDED</span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                    {stats?.requests?.funded || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3 className="admin-section-title">User Accounts Directory</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {users.length} of {userPagination.total} users
            </span>
          </div>

          {/* Controls Bar */}
          <div className="admin-controls-bar">
            <div className="admin-search-box">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search by name, phone, email, village..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  fetchUsers(1, userRoleFilter, userStatusFilter, e.target.value);
                }}
              />
            </div>

            <div className="filter-pills-row">
              {['all', 'farmer', 'donor', 'verifier', 'admin'].map((role) => (
                <button
                  key={role}
                  type="button"
                  className={`filter-pill ${userRoleFilter === role ? 'active' : ''}`}
                  onClick={() => {
                    setUserRoleFilter(role);
                    fetchUsers(1, role, userStatusFilter, userSearch);
                  }}
                >
                  {role.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="filter-pills-row">
              {['all', 'active', 'inactive'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${userStatusFilter === st ? 'active' : ''}`}
                  onClick={() => {
                    setUserStatusFilter(st);
                    fetchUsers(1, userRoleFilter, st, userSearch);
                  }}
                >
                  {st === 'all' ? 'ALL STATUS' : st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="admin-table-container admin-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Location / Farm</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No user accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Joined: {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${u.role}`}>{u.role.toUpperCase()}</span>
                      </td>
                      <td>
                        <div>{u.phone}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td>
                        <div>{u.location}</div>
                        {u.cropType !== '—' && (
                          <div style={{ fontSize: '11.5px', color: '#166534' }}>
                            {u.cropType} • {u.landSizeAcres} acres
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.verificationStatus === 'verified' ? 'badge-approved' : 'badge-under_review'
                          }`}
                        >
                          {u.verificationStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => openUserDetails(u.id)}
                            title="View Full Profile"
                          >
                            <Eye size={13} /> Details
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => {
                              setRoleChangeUser(u);
                              setNewRole(u.role);
                            }}
                            title="Change User Role"
                          >
                            Role
                          </button>
                          {String(user.id) !== String(u.id) && (
                            <button
                              type="button"
                              className={u.isActive ? 'btn-danger' : 'btn-success'}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => setStatusConfirmUser(u)}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="admin-mobile-cards">
            {users.map((u) => (
              <div className="admin-card-item" key={u.id}>
                <div className="admin-card-header">
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{u.phone}</div>
                  </div>
                  <span className={`badge badge-${u.role}`}>{u.role.toUpperCase()}</span>
                </div>
                <div className="admin-card-row">
                  <span>Location</span>
                  <span>{u.location}</span>
                </div>
                <div className="admin-card-row">
                  <span>Verification</span>
                  <span className={`badge ${u.verificationStatus === 'verified' ? 'badge-approved' : 'badge-under_review'}`}>
                    {u.verificationStatus}
                  </span>
                </div>
                <div className="admin-card-row">
                  <span>Account</span>
                  <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="admin-card-actions">
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => openUserDetails(u.id)}>
                    <Eye size={13} /> View
                  </button>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => { setRoleChangeUser(u); setNewRole(u.role); }}>
                    Role
                  </button>
                  {String(user.id) !== String(u.id) && (
                    <button
                      type="button"
                      className={u.isActive ? 'btn-danger' : 'btn-success'}
                      style={{ flex: 1 }}
                      onClick={() => setStatusConfirmUser(u)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Page {userPagination.page} of {userPagination.totalPages}
            </span>
            <div className="admin-pagination-btns">
              <button
                type="button"
                className="btn-secondary"
                disabled={userPagination.page <= 1}
                onClick={() => {
                  const p = userPagination.page - 1;
                  setUserPage(p);
                  fetchUsers(p);
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={userPagination.page >= userPagination.totalPages}
                onClick={() => {
                  const p = userPagination.page + 1;
                  setUserPage(p);
                  fetchUsers(p);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSISTANCE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3 className="admin-section-title">Assistance Requests Oversight</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {requests.length} of {reqPagination.total} requests
            </span>
          </div>

          {/* Controls Bar */}
          <div className="admin-controls-bar">
            <div className="admin-search-box">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                placeholder="Search request title, reason, farmer..."
                value={reqSearch}
                onChange={(e) => {
                  setReqSearch(e.target.value);
                  fetchRequests(1, reqStatusFilter, reqCategoryFilter, e.target.value);
                }}
              />
            </div>

            <div className="filter-pills-row">
              {['all', 'submitted', 'under_review', 'approved', 'funded', 'rejected'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${reqStatusFilter === st ? 'active' : ''}`}
                  onClick={() => {
                    setReqStatusFilter(st);
                    fetchRequests(1, st, reqCategoryFilter, reqSearch);
                  }}
                >
                  {st.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="admin-table-container admin-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Request Title</th>
                  <th>Farmer</th>
                  <th>Category</th>
                  <th>Goal & Funding</th>
                  <th>Status</th>
                  <th>Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      Loading assistance requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No assistance requests found matching filters.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => {
                    const percent = Math.min(
                      100,
                      Math.round(((r.amountFunded || 0) / (r.amountRequested || 1)) * 100)
                    );
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.title}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Created: {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <div>{r.farmer?.name || 'Farmer'}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{r.farmer?.location}</div>
                        </td>
                        <td>
                          <span style={{ textTransform: 'capitalize' }}>{r.category}</span>
                        </td>
                        <td>
                          <div>
                            <strong>₹{Number(r.amountFunded || 0).toLocaleString()}</strong> / ₹
                            {Number(r.amountRequested || 0).toLocaleString()}
                          </div>
                          <div className="funding-bar-bg">
                            <div className="funding-bar-fill" style={{ width: `${percent}%` }}></div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#166534' }}>{percent}% funded</span>
                        </td>
                        <td>
                          <span className={`badge badge-${r.status}`}>{r.status.toUpperCase()}</span>
                        </td>
                        <td>
                          {r.reviewedBy ? (
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                              {r.reviewedBy.name} ({r.reviewedBy.role})
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => {
                              setViewingRequest(r);
                              setOverrideStatus(r.status);
                              setOverrideNotes(r.reviewNotes || '');
                              setOverrideReason(r.rejectionReason || '');
                            }}
                          >
                            <SlidersHorizontal size={13} /> Override
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="admin-mobile-cards">
            {requests.map((r) => (
              <div className="admin-card-item" key={r.id}>
                <div className="admin-card-header">
                  <strong>{r.title}</strong>
                  <span className={`badge badge-${r.status}`}>{r.status.toUpperCase()}</span>
                </div>
                <div className="admin-card-row">
                  <span>Farmer</span>
                  <strong>{r.farmer?.name}</strong>
                </div>
                <div className="admin-card-row">
                  <span>Funding</span>
                  <span>
                    ₹{Number(r.amountFunded || 0).toLocaleString()} of ₹{Number(r.amountRequested || 0).toLocaleString()}
                  </span>
                </div>
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setViewingRequest(r);
                      setOverrideStatus(r.status);
                      setOverrideNotes(r.reviewNotes || '');
                      setOverrideReason(r.rejectionReason || '');
                    }}
                  >
                    <SlidersHorizontal size={13} /> Manage Request
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Page {reqPagination.page} of {reqPagination.totalPages}
            </span>
            <div className="admin-pagination-btns">
              <button
                type="button"
                className="btn-secondary"
                disabled={reqPagination.page <= 1}
                onClick={() => {
                  const p = reqPagination.page - 1;
                  setReqPage(p);
                  fetchRequests(p);
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={reqPagination.page >= reqPagination.totalPages}
                onClick={() => {
                  const p = reqPagination.page + 1;
                  setReqPage(p);
                  fetchRequests(p);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DONATIONS & RAZORPAY LEDGER */}
      {activeTab === 'donations' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <div>
              <h3 className="admin-section-title">Razorpay Transaction Ledger</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Audited record of all direct donor contributions and payment gateway settlements
              </p>
            </div>
            <div className="filter-pills-row">
              {['all', 'completed', 'pending', 'failed', 'simulated'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill ${donationStatusFilter === st ? 'active' : ''}`}
                  onClick={() => {
                    setDonationStatusFilter(st);
                    fetchDonations(1, st);
                  }}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="admin-table-container admin-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Razorpay Payment ID</th>
                  <th>Donor</th>
                  <th>Assistance Request & Farmer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingDonations ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      Loading donation ledger...
                    </td>
                  </tr>
                ) : donations.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No donation transactions found for this filter.
                    </td>
                  </tr>
                ) : (
                  donations.map((d) => (
                    <tr key={d.id}>
                      <td>{new Date(d.createdAt).toLocaleString()}</td>
                      <td>
                        <code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {d.razorpayPaymentId}
                        </code>
                        {d.razorpayOrderId !== '—' && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            Order: {d.razorpayOrderId}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{d.donor.name}</strong>
                        {d.donor.phone !== '—' && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{d.donor.phone}</div>
                        )}
                      </td>
                      <td>
                        <strong>{d.request?.title || 'Assistance Request'}</strong>
                        <div style={{ fontSize: '11.5px', color: '#166534' }}>
                          {d.request?.farmerName} ({d.request?.farmerLocation})
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#153f32', fontSize: '15px' }}>
                        ₹{Number(d.amount).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            d.status === 'completed' || d.status === 'simulated'
                              ? 'badge-approved'
                              : d.status === 'failed'
                              ? 'badge-rejected'
                              : 'badge-under_review'
                          }`}
                        >
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="admin-mobile-cards">
            {donations.map((d) => (
              <div className="admin-card-item" key={d.id}>
                <div className="admin-card-header">
                  <div>
                    <strong style={{ color: '#153f32', fontSize: '16px' }}>
                      ₹{Number(d.amount).toLocaleString()}
                    </strong>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      d.status === 'completed' || d.status === 'simulated' ? 'badge-approved' : 'badge-rejected'
                    }`}
                  >
                    {d.status.toUpperCase()}
                  </span>
                </div>
                <div className="admin-card-row">
                  <span>Donor</span>
                  <strong>{d.donor.name}</strong>
                </div>
                <div className="admin-card-row">
                  <span>Beneficiary</span>
                  <span>{d.request?.farmerName}</span>
                </div>
                <div className="admin-card-row">
                  <span>Payment ID</span>
                  <code style={{ fontSize: '11px' }}>{d.razorpayPaymentId}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Page {donationPagination.page} of {donationPagination.totalPages}
            </span>
            <div className="admin-pagination-btns">
              <button
                type="button"
                className="btn-secondary"
                disabled={donationPagination.page <= 1}
                onClick={() => {
                  const p = donationPagination.page - 1;
                  setDonationPage(p);
                  fetchDonations(p);
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={donationPagination.page >= donationPagination.totalPages}
                onClick={() => {
                  const p = donationPagination.page + 1;
                  setDonationPage(p);
                  fetchDonations(p);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h3 className="admin-section-title">System Audit Log Trail</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {auditLogs.length} of {auditPagination.total} logged system events
            </span>
          </div>

          <div className="admin-table-container admin-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Remarks / Diff</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <strong>{log.actor?.name || 'System / Automated'}</strong>
                        {log.actor?.role && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{log.actor.role}</div>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', color: '#153f32', fontWeight: 600 }}>
                          {log.action}
                        </code>
                      </td>
                      <td>{log.targetType}</td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>{log.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="admin-mobile-cards">
            {auditLogs.map((log) => (
              <div className="admin-card-item" key={log.id}>
                <div className="admin-card-header">
                  <strong>{log.action}</strong>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="admin-card-row">
                  <span>Actor</span>
                  <span>{log.actor?.name || 'System'} ({log.actor?.role || 'Service'})</span>
                </div>
                <div className="admin-card-row">
                  <span>Note</span>
                  <span>{log.note}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Page {auditPagination.page} of {auditPagination.totalPages}
            </span>
            <div className="admin-pagination-btns">
              <button
                type="button"
                className="btn-secondary"
                disabled={auditPagination.page <= 1}
                onClick={() => {
                  const p = auditPagination.page - 1;
                  setAuditPage(p);
                  fetchAuditLogs(p);
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={auditPagination.page >= auditPagination.totalPages}
                onClick={() => {
                  const p = auditPagination.page + 1;
                  setAuditPage(p);
                  fetchAuditLogs(p);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: USER DETAILS */}
      {viewingUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2>User Account Dossier</h2>
              <button className="modal-close-btn" onClick={() => setViewingUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingUserModal ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading profile and documents...
                </div>
              ) : userModalData?.user ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', color: '#153f32' }}>
                        {userModalData.user.name}
                      </h3>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Phone: {userModalData.user.phone} {userModalData.user.email ? `• ${userModalData.user.email}` : ''}
                      </span>
                    </div>
                    <span className={`badge badge-${userModalData.user.role}`}>
                      {userModalData.user.role.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                    <div><strong>Location:</strong> {[userModalData.user.village, userModalData.user.district, userModalData.user.state].filter(Boolean).join(', ') || 'Not specified'}</div>
                    {userModalData.user.cropType && (
                      <div style={{ marginTop: '4px' }}>
                        <strong>Crops & Land:</strong> {userModalData.user.cropType} • {userModalData.user.landSizeAcres} acres
                      </div>
                    )}
                    <div style={{ marginTop: '4px' }}>
                      <strong>Verification Status:</strong> {userModalData.user.verificationStatus}
                    </div>
                  </div>

                  {/* Documents Section */}
                  <h4 style={{ margin: '14px 0 8px 0', fontSize: '15px', color: '#153f32' }}>Uploaded Documents</h4>
                  {userModalData.documents?.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>No documents uploaded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {userModalData.documents.map((doc) => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '13px' }}>
                          <span><strong>{doc.documentType.toUpperCase()}:</strong> {doc.originalName || 'Document'}</span>
                          <span className={`badge ${doc.status === 'verified' ? 'badge-approved' : 'badge-under_review'}`}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Requests Section if Farmer */}
                  {userModalData.requests?.length > 0 && (
                    <>
                      <h4 style={{ margin: '14px 0 8px 0', fontSize: '15px', color: '#153f32' }}>Assistance Requests ({userModalData.requests.length})</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {userModalData.requests.map((r) => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                            <span>{r.title}</span>
                            <strong>₹{Number(r.amountRequested).toLocaleString()} ({r.status})</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setViewingUser(null)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ROLE */}
      {roleChangeUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Change User Role</h2>
              <button className="modal-close-btn" onClick={() => setRoleChangeUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 14px 0', fontSize: '14px', color: '#475569' }}>
                Select a new system role for <strong>{roleChangeUser.name}</strong> ({roleChangeUser.phone}):
              </p>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="farmer">Farmer (Agri Workspace)</option>
                <option value="donor">Donor (Supporter)</option>
                <option value="verifier">Verifier (Case Officer)</option>
                <option value="admin">Admin (System Administrator)</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setRoleChangeUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleChangeRole}>
                Save Role Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM STATUS TOGGLE */}
      {statusConfirmUser && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Confirm Account Status</h2>
              <button className="modal-close-btn" onClick={() => setStatusConfirmUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
                Are you sure you want to {statusConfirmUser.isActive ? 'DEACTIVATE' : 'ACTIVATE'} the account for{' '}
                <strong>{statusConfirmUser.name}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setStatusConfirmUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={statusConfirmUser.isActive ? 'btn-danger' : 'btn-success'}
                onClick={handleToggleStatus}
              >
                Confirm {statusConfirmUser.isActive ? 'Deactivation' : 'Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST STATUS OVERRIDE */}
      {viewingRequest && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2>Admin Request Override</h2>
              <button className="modal-close-btn" onClick={() => setViewingRequest(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#153f32' }}>
                  {viewingRequest.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Farmer: <strong>{viewingRequest.farmer?.name}</strong> | Goal: ₹{Number(viewingRequest.amountRequested).toLocaleString()}
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                <div><strong>Purpose / Need:</strong> {viewingRequest.purpose || viewingRequest.reason || '—'}</div>
                {viewingRequest.intendedUse && (
                  <div style={{ marginTop: '4px' }}><strong>Intended Use:</strong> {viewingRequest.intendedUse}</div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Override Status To:
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved & Published</option>
                  <option value="funded">Funded (100%)</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Admin Review Notes (Optional):
                </label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Reason for administrative override or instructions for the farmer..."
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {overrideStatus === 'rejected' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '6px' }}>
                    Rejection Reason (Visible to Farmer):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why this request is being rejected..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setViewingRequest(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleOverrideRequestStatus}>
                Save Status Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
