import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, CheckCircle2, AlertTriangle, Check, XCircle, HelpCircle, Loader2, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Button from '../components/Button'
import { useAdminAuth } from '../context/AdminAuthContext'

const API_URL = import.meta.env.VITE_API_URL || ''

// ---------------------------------------------------------------------------
// Helper — time-ago formatter
// ---------------------------------------------------------------------------
function formatTimeAgo(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'FOUND', 'CLOSED']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { adminUser, logout } = useAdminAuth()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [cases, setCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showDisputedOnly, setShowDisputedOnly] = useState(false)

  const [selectedCase, setSelectedCase] = useState(null)
  const [showForceCloseModal, setShowForceCloseModal] = useState(false)
  const [adminActionLog, setAdminActionLog] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Build unique category list from real data
  // ---------------------------------------------------------------------------
  const categoryOptions = useMemo(() => {
    const cats = new Set(cases.map((c) => c.category || 'other'))
    return ['ALL', ...Array.from(cats).sort()]
  }, [cases])

  // ---------------------------------------------------------------------------
  // Fetch items from backend
  // ---------------------------------------------------------------------------
  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/items`)
      const data = await res.json()

      if (data.success && Array.isArray(data.items)) {
        setCases(data.items)
      } else {
        setLoadError(data.error || 'Failed to load items')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setLoadError('Cannot reach the server. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // ---------------------------------------------------------------------------
  // Derived list based on filters
  // ---------------------------------------------------------------------------
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false
      if (showDisputedOnly && !c.disputed) return false
      return true
    })
  }, [cases, statusFilter, categoryFilter, showDisputedOnly])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      navigate('/admin/login', { replace: true })
    }
  }

  // ---------------------------------------------------------------------------
  // Force close — call backend
  // ---------------------------------------------------------------------------
  const openForceCloseModal = (adminCase) => {
    setSelectedCase(adminCase)
    setShowForceCloseModal(true)
  }

  const handleForceClose = async () => {
    if (!selectedCase) return
    setActionLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/items/${selectedCase.id}/force-close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Unresolved / abandoned (admin override)' }),
      })
      const data = await res.json()

      if (data.success) {
        // Update local state
        setCases((prev) =>
          prev.map((c) =>
            c.id === selectedCase.id ? { ...c, status: 'CLOSED', closedAt: new Date().toISOString() } : c
          ),
        )

        setAdminActionLog((prev) => [
          {
            id: `LOG-${Date.now()}`,
            caseId: selectedCase.id,
            title: selectedCase.title,
            type: 'Force Close',
            reason: 'Unresolved / abandoned (admin override)',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ])
      }
    } catch (err) {
      console.error('Force close error:', err)
    } finally {
      setActionLoading(false)
      setShowForceCloseModal(false)
      setSelectedCase(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete item permanently from Firestore
  // ---------------------------------------------------------------------------
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/items/${item.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        // Remove from local state
        setCases((prev) => prev.filter((c) => c.id !== item.id))

        setAdminActionLog((prev) => [
          {
            id: `LOG-${Date.now()}`,
            caseId: item.id,
            title: item.title,
            type: 'Delete',
            reason: 'Permanently removed from Firestore',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ])
      } else {
        alert('Failed to delete: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete item')
    }
  }

  // ---------------------------------------------------------------------------
  // Verify / Reject / Desk — call backend
  // ---------------------------------------------------------------------------
  const handleVerifyAction = async (actionType) => {
    if (!selectedCase) return
    setActionLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/items/${selectedCase.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType }),
      })
      const data = await res.json()

      if (data.success && data.item) {
        setCases((prev) =>
          prev.map((c) => (c.id === selectedCase.id ? { ...c, ...data.item } : c)),
        )
      }

      setAdminActionLog((prev) => [
        {
          id: `LOG-${Date.now()}`,
          caseId: selectedCase.id,
          title: selectedCase.title,
          type:
            actionType === 'verify'
              ? 'Verified Owner Claim'
              : actionType === 'reject'
              ? 'Rejected Claim'
              : 'Desk Recommended',
          reason: `Admin action: ${actionType}`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ])
    } catch (err) {
      console.error('Verify action error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const disputedCases = cases.filter((c) => c.disputed && c.status !== 'CLOSED')

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Layout show3D={false}>
        <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#F59E0B] mx-auto mb-3" />
            <p className="text-[#475569] text-sm font-medium">Loading cases from Firestore…</p>
          </div>
        </div>
      </Layout>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (loadError) {
    return (
      <Layout show3D={false}>
        <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED] px-4">
          <Card className="max-w-md w-full text-center p-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#1E293B] mb-2">Failed to Load</h2>
            <p className="text-sm text-[#475569] mb-4">{loadError}</p>
            <Button onClick={fetchItems}>
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Retry
            </Button>
          </Card>
        </div>
      </Layout>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Layout show3D={false}>
      <div className="min-h-screen px-4 py-6 md:py-10 bg-[#FFF7ED]">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[#1E293B] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#F59E0B]" />
                  Admin Case Oversight
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {cases.length} total case{cases.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <p className="text-sm text-[#475569] mt-1">
                Real-time case data from Firestore. No personal data is shown.
              </p>
              {adminUser && (
                <p className="text-xs text-[#64748B] mt-1">
                  Admin account: {adminUser.email}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 self-start">
              <Button
                variant="secondary"
                size="md"
                onClick={fetchItems}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button 
                variant="secondary" 
                size="md"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Active Cases + Filters */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-[#1E293B]">
                      Cases
                    </h2>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Showing {filteredCases.length} of {cases.length} cases from Firestore.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end text-xs">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          Status: {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                    >
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          Category: {c}
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showDisputedOnly}
                        onChange={(e) => setShowDisputedOnly(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#F59E0B] focus:ring-[#F59E0B]"
                      />
                      <span>Disputed only</span>
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                  <table className="min-w-full text-left text-xs md:text-sm">
                    <thead className="bg-orange-50/60 text-[11px] uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3 md:px-6">Title</th>
                        <th className="px-4 py-3 md:px-6">Category</th>
                        <th className="px-4 py-3 md:px-6">Location</th>
                        <th className="px-4 py-3 md:px-6">Status</th>
                        <th className="px-4 py-3 md:px-6">Reported</th>
                        <th className="px-4 py-3 md:px-6">Disputed</th>
                        <th className="px-4 py-3 md:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-8 text-center text-xs text-[#9CA3AF]"
                          >
                            No cases matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredCases.map((c) => (
                          <tr
                            key={c.id}
                            className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors"
                          >
                            <td className="px-4 py-3 md:px-6 font-medium text-[#111827] max-w-[180px] truncate">
                              {c.title}
                            </td>
                            <td className="px-4 py-3 md:px-6 text-[#374151] capitalize">
                              {c.category}
                            </td>
                            <td className="px-4 py-3 md:px-6 text-[#4B5563]">
                              {c.location}
                            </td>
                            <td className="px-4 py-3 md:px-6">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${
                                  c.status === 'ACTIVE'
                                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                                    : c.status === 'FOUND'
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 md:px-6 text-[#6B7280]">
                              {formatTimeAgo(c.createdAt)}
                            </td>
                            <td className="px-4 py-3 md:px-6">
                              {c.disputed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 bg-red-50 text-[11px] text-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  Yes
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#9CA3AF]">No</span>
                              )}
                            </td>
                            <td className="px-4 py-3 md:px-6 text-right">
                              <div className="flex justify-end gap-2">
                                {c.disputed && c.status !== 'CLOSED' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-[11px] px-3 py-1"
                                    onClick={() => setSelectedCase(c)}
                                  >
                                    Review
                                  </Button>
                                )}
                                {(c.status === 'ACTIVE' || c.status === 'FOUND') && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-[11px] px-3 py-1 text-red-700 border-red-200 hover:border-red-300"
                                    onClick={() => openForceCloseModal(c)}
                                  >
                                    Force Close
                                  </Button>
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-[11px] px-3 py-1 text-red-700 bg-red-50 border-red-300 hover:bg-red-100"
                                  onClick={() => handleDeleteItem(c)}
                                >
                                  🗑️ Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Admin Action Log */}
              <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-[#1E293B]">
                    Admin Action Log
                  </h2>
                  <HelpCircle className="w-4 h-4 text-[#9CA3AF]" />
                </div>
                {adminActionLog.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">
                    No admin actions have been recorded in this session.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                    {adminActionLog.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0"
                      >
                        <div>
                          <p className="font-semibold text-[#111827]">{entry.type}</p>
                          <p className="text-[11px] text-[#4B5563]">
                            {entry.title || `Case: ${entry.caseId}`}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">{entry.reason}</p>
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] whitespace-nowrap">
                          {entry.timestamp}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Disputed Case Verification */}
            <div className="space-y-4">
              <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-[#1E293B]">
                    Disputed Items
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    {disputedCases.length} open
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mb-4">
                  Admins work only with case metadata and dispute flags. No owner or finder details are visible.
                </p>

                {disputedCases.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">
                    No disputed items at the moment.
                  </p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {disputedCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-xl border ${
                          selectedCase?.id === c.id
                            ? 'border-[#F59E0B] bg-orange-50/70'
                            : 'border-gray-200 bg-white hover:border-[#F59E0B]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#4B5563] truncate max-w-[120px]">{c.title}</span>
                          <span className="text-[11px] text-[#6B7280] capitalize">{c.category}</span>
                          <span className="text-[11px] text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Disputed
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Disputed Case Detail Panel */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  {selectedCase && selectedCase.disputed ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[#111827]">
                          {selectedCase.title}
                        </p>
                        {selectedCase.adminDeskReview && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-[11px] text-blue-700">
                            <HelpCircle className="w-3 h-3" />
                            Desk recommended
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4B5563]">
                        <p>Category: <span className="font-medium capitalize">{selectedCase.category}</span></p>
                        <p>Location: <span className="font-medium">{selectedCase.location}</span></p>
                        <p>Status: <span className="font-medium">{selectedCase.status}</span></p>
                        <p>Reported: <span className="font-medium">{formatTimeAgo(selectedCase.createdAt)}</span></p>
                      </div>

                      {selectedCase.description && (
                        <div className="mt-2 p-3 rounded-xl bg-orange-50 border border-orange-100">
                          <p className="text-[11px] font-semibold text-orange-800 mb-1">
                            Item Description
                          </p>
                          <p className="text-[11px] text-orange-700 leading-relaxed">
                            {selectedCase.description}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 text-[11px]"
                          disabled={actionLoading}
                          onClick={() => handleVerifyAction('verify')}
                        >
                          <Check className="w-3 h-3 mr-1 inline" />
                          Verify Owner Claim
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 text-[11px] border-red-200 text-red-700 hover:border-red-300"
                          disabled={actionLoading}
                          onClick={() => handleVerifyAction('reject')}
                        >
                          <XCircle className="w-3 h-3 mr-1 inline" />
                          Reject Claim
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 text-[11px] border-blue-200 text-blue-700 hover:border-blue-300"
                          disabled={actionLoading}
                          onClick={() => handleVerifyAction('desk')}
                        >
                          <HelpCircle className="w-3 h-3 mr-1 inline" />
                          Recommend Desk
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#9CA3AF]">
                      Select a disputed case to view details and verification options.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Force Close Confirmation Modal */}
        {showForceCloseModal && selectedCase && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
            <Card className="max-w-md w-full bg-white shadow-2xl">
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                Force Close Case
              </h3>
              <p className="text-sm text-[#475569] mb-4">
                Close this case if it appears unresolved or abandoned. This will move the case out of the active list.
              </p>
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-800">
                <p className="font-semibold mb-1">{selectedCase.title}</p>
                <p>
                  {selectedCase.category} · {selectedCase.location} · {selectedCase.status}
                </p>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={actionLoading}
                  onClick={() => {
                    setShowForceCloseModal(false)
                    setSelectedCase(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={actionLoading}
                  onClick={handleForceClose}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1 inline" />
                      Closing…
                    </>
                  ) : (
                    'Force Close Case'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  )
}
