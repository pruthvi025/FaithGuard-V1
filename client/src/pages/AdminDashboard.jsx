import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Shield, CheckCircle2, AlertTriangle, Check, XCircle,
  HelpCircle, Loader2, RefreshCw, Trash2, MessageSquare, FileText,
  ClipboardList, Package, Search as SearchIcon, X
} from 'lucide-react'
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

const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'FOUND', 'CLOSED', 'RECOVERY-IN-PROGRESS']
const TABS = [
  { key: 'items', label: 'Items', icon: Package },
  { key: 'claims', label: 'Claims', icon: ClipboardList },
  { key: 'conversations', label: 'Conversations', icon: MessageSquare },
  { key: 'auditLog', label: 'Audit Log', icon: FileText },
]

// ===========================================================================
// Confirmation Modal Component
// ===========================================================================
function ConfirmDeleteModal({ show, title, details, loading, onConfirm, onCancel }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
      >
        <Card className="max-w-md w-full bg-white shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E293B]">{title}</h3>
          </div>
          <p className="text-sm text-[#475569] mb-3">
            Are you sure you want to permanently delete this record?{' '}
            <span className="font-semibold text-red-600">This action cannot be undone.</span>
          </p>
          {details && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-800">
              {details}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1 inline" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1 inline" />
                  Delete Permanently
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

// ===========================================================================
// Main Dashboard Component
// ===========================================================================
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { adminUser, logout } = useAdminAuth()

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('items')

  // Items state
  const [lostItems, setLostItems] = useState([])
  const [foundItems, setFoundItems] = useState([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Claims state
  const [claims, setClaims] = useState([])
  const [isLoadingClaims, setIsLoadingClaims] = useState(false)

  // Conversations state
  const [conversations, setConversations] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)

  // Audit log state
  const [auditLogs, setAuditLogs] = useState([])
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false)

  // General
  const [loadError, setLoadError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showDisputedOnly, setShowDisputedOnly] = useState(false)
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL') // ALL, LOST, FOUND
  const [claimTypeFilter, setClaimTypeFilter] = useState('ALL') // ALL, lost, found
  const [claimStatusFilter, setClaimStatusFilter] = useState('ALL') // ALL, pending, approved, rejected

  // Selected case for dispute review
  const [selectedCase, setSelectedCase] = useState(null)
  const [showForceCloseModal, setShowForceCloseModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({ show: false, title: '', details: '', onConfirm: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Build unique category list from real data
  // ---------------------------------------------------------------------------
  const allItems = useMemo(() => {
    const combined = [...lostItems, ...foundItems]
    if (itemTypeFilter === 'LOST') return lostItems
    if (itemTypeFilter === 'FOUND') return foundItems
    return combined
  }, [lostItems, foundItems, itemTypeFilter])

  const categoryOptions = useMemo(() => {
    const cats = new Set(allItems.map((c) => c.category || 'other'))
    return ['ALL', ...Array.from(cats).sort()]
  }, [allItems])

  // ---------------------------------------------------------------------------
  // Fetch functions
  // ---------------------------------------------------------------------------
  const fetchItems = useCallback(async () => {
    setIsLoadingItems(true)
    setLoadError(null)
    try {
      const [lostRes, foundRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard/items`),
        fetch(`${API_URL}/api/admin/dashboard/found-items`),
      ])
      const [lostData, foundData] = await Promise.all([lostRes.json(), foundRes.json()])

      if (lostData.success) setLostItems(lostData.items || [])
      if (foundData.success) setFoundItems(foundData.items || [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setLoadError('Cannot reach the server. Is the backend running?')
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  const fetchClaims = useCallback(async () => {
    setIsLoadingClaims(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/claims`)
      const data = await res.json()
      if (data.success) setClaims(data.claims || [])
    } catch (err) {
      console.error('Claims fetch error:', err)
    } finally {
      setIsLoadingClaims(false)
    }
  }, [])

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/conversations`)
      const data = await res.json()
      if (data.success) setConversations(data.conversations || [])
    } catch (err) {
      console.error('Conversations fetch error:', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingAuditLogs(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard/audit-logs`)
      const data = await res.json()
      if (data.success) setAuditLogs(data.logs || [])
    } catch (err) {
      console.error('Audit logs fetch error:', err)
    } finally {
      setIsLoadingAuditLogs(false)
    }
  }, [])

  // Initial load
  useEffect(() => { fetchItems() }, [fetchItems])

  // Lazy-load tab data
  useEffect(() => {
    if (activeTab === 'claims' && claims.length === 0 && !isLoadingClaims) fetchClaims()
    if (activeTab === 'conversations' && conversations.length === 0 && !isLoadingConversations) fetchConversations()
    if (activeTab === 'auditLog' && auditLogs.length === 0 && !isLoadingAuditLogs) fetchAuditLogs()
  }, [activeTab])

  const handleRefresh = () => {
    if (activeTab === 'items') fetchItems()
    if (activeTab === 'claims') fetchClaims()
    if (activeTab === 'conversations') fetchConversations()
    if (activeTab === 'auditLog') fetchAuditLogs()
  }

  // ---------------------------------------------------------------------------
  // Filtered lists
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return allItems.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false
      if (showDisputedOnly && !c.disputed) return false
      return true
    })
  }, [allItems, statusFilter, categoryFilter, showDisputedOnly])

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (claimTypeFilter !== 'ALL' && c.claimType !== claimTypeFilter) return false
      if (claimStatusFilter !== 'ALL' && c.status !== claimStatusFilter) return false
      return true
    })
  }, [claims, claimTypeFilter, claimStatusFilter])

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const handleLogout = async () => {
    const result = await logout()
    if (result.success) navigate('/admin/login', { replace: true })
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
        setLostItems((prev) => prev.map((c) => c.id === selectedCase.id ? { ...c, status: 'CLOSED', closedAt: new Date().toISOString() } : c))
        setFoundItems((prev) => prev.map((c) => c.id === selectedCase.id ? { ...c, status: 'CLOSED', closedAt: new Date().toISOString() } : c))
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
  // DELETE — Item (lost or found)
  // ---------------------------------------------------------------------------
  const handleDeleteItem = (item) => {
    const isFound = item.itemType === 'found'
    setDeleteModal({
      show: true,
      title: `Delete ${isFound ? 'Found' : 'Lost'} Item`,
      details: `"${item.title}" — ${item.category} · ${item.location}\n\nAll related claims, conversations, and messages will also be permanently deleted.`,
      onConfirm: async () => {
        setDeleteLoading(true)
        try {
          const endpoint = isFound
            ? `${API_URL}/api/admin/dashboard/found-items/${item.id}`
            : `${API_URL}/api/admin/dashboard/items/${item.id}`
          const res = await fetch(endpoint, { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            if (isFound) {
              setFoundItems((prev) => prev.filter((c) => c.id !== item.id))
            } else {
              setLostItems((prev) => prev.filter((c) => c.id !== item.id))
            }
            // Refresh audit logs if on that tab
            fetchAuditLogs()
          } else {
            alert('Failed to delete: ' + (data.error || 'Unknown error'))
          }
        } catch (err) {
          console.error('Delete error:', err)
          alert('Failed to delete item')
        } finally {
          setDeleteLoading(false)
          setDeleteModal({ show: false, title: '', details: '', onConfirm: null })
        }
      },
    })
  }

  // ---------------------------------------------------------------------------
  // DELETE — Claim
  // ---------------------------------------------------------------------------
  const handleDeleteClaim = (claim) => {
    setDeleteModal({
      show: true,
      title: 'Delete Claim',
      details: `Claim ${claim.claimId.substring(0, 8)}... (${claim.claimType} claim)\nStatus: ${claim.status} · Item: ${claim.itemId.substring(0, 12)}...\n\nRelated conversation and messages will also be deleted.`,
      onConfirm: async () => {
        setDeleteLoading(true)
        try {
          const res = await fetch(`${API_URL}/api/admin/dashboard/claims/${claim.id}?type=${claim.claimType}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            setClaims((prev) => prev.filter((c) => c.id !== claim.id))
            fetchAuditLogs()
          } else {
            alert('Failed to delete: ' + (data.error || 'Unknown error'))
          }
        } catch (err) {
          console.error('Delete claim error:', err)
          alert('Failed to delete claim')
        } finally {
          setDeleteLoading(false)
          setDeleteModal({ show: false, title: '', details: '', onConfirm: null })
        }
      },
    })
  }

  // ---------------------------------------------------------------------------
  // DELETE — Conversation
  // ---------------------------------------------------------------------------
  const handleDeleteConversation = (conv) => {
    setDeleteModal({
      show: true,
      title: 'Delete Conversation',
      details: `Conversation for item: ${conv.itemId.substring(0, 12)}...\n${conv.messageCount} message${conv.messageCount !== 1 ? 's' : ''} will be permanently deleted.`,
      onConfirm: async () => {
        setDeleteLoading(true)
        try {
          const res = await fetch(`${API_URL}/api/admin/dashboard/conversations/${conv.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            setConversations((prev) => prev.filter((c) => c.id !== conv.id))
            fetchAuditLogs()
          } else {
            alert('Failed to delete: ' + (data.error || 'Unknown error'))
          }
        } catch (err) {
          console.error('Delete conversation error:', err)
          alert('Failed to delete conversation')
        } finally {
          setDeleteLoading(false)
          setDeleteModal({ show: false, title: '', details: '', onConfirm: null })
        }
      },
    })
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
        setLostItems((prev) => prev.map((c) => (c.id === selectedCase.id ? { ...c, ...data.item } : c)))
      }
    } catch (err) {
      console.error('Verify action error:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const disputedCases = allItems.filter((c) => c.disputed && c.status !== 'CLOSED')

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  const totalItems = lostItems.length + foundItems.length
  const activeClaims = claims.filter((c) => c.status === 'pending').length
  const totalConvs = conversations.length

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoadingItems && lostItems.length === 0 && foundItems.length === 0) {
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-[#1E293B] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#F59E0B]" />
                  Admin Dashboard
                </h1>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
                  <Package className="w-3 h-3" />
                  {totalItems} Items
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700">
                  <ClipboardList className="w-3 h-3" />
                  {activeClaims} Pending Claims
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full text-xs font-medium text-purple-700">
                  <MessageSquare className="w-3 h-3" />
                  {totalConvs} Conversations
                </span>
              </div>
              {adminUser && (
                <p className="text-xs text-[#64748B] mt-2">
                  Admin: {adminUser.email}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 self-start">
              <Button variant="secondary" size="md" onClick={handleRefresh} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              <Button variant="secondary" size="md" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/80 p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#F59E0B] text-white shadow-md'
                      : 'text-[#6B7280] hover:text-[#1E293B] hover:bg-orange-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ============================================================= */}
          {/* ITEMS TAB */}
          {/* ============================================================= */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-base md:text-lg font-semibold text-[#1E293B]">
                        All Items (Lost + Found)
                      </h2>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Showing {filteredItems.length} of {allItems.length} items
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end text-xs">
                      <select
                        value={itemTypeFilter}
                        onChange={(e) => setItemTypeFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                      >
                        <option value="ALL">Type: ALL</option>
                        <option value="LOST">Type: LOST</option>
                        <option value="FOUND">Type: FOUND</option>
                      </select>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>Status: {s}</option>
                        ))}
                      </select>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>Category: {c}</option>
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
                          <th className="px-4 py-3 md:px-5">Type</th>
                          <th className="px-4 py-3 md:px-5">Title</th>
                          <th className="px-4 py-3 md:px-5">Category</th>
                          <th className="px-4 py-3 md:px-5">Location</th>
                          <th className="px-4 py-3 md:px-5">Status</th>
                          <th className="px-4 py-3 md:px-5">Reported</th>
                          <th className="px-4 py-3 md:px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
                              No items matching the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((c) => (
                            <tr key={`${c.itemType}-${c.id}`} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                              <td className="px-4 py-3 md:px-5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  c.itemType === 'found'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {c.itemType === 'found' ? 'Found' : 'Lost'}
                                </span>
                              </td>
                              <td className="px-4 py-3 md:px-5 font-medium text-[#111827] max-w-[160px] truncate">
                                {c.title}
                              </td>
                              <td className="px-4 py-3 md:px-5 text-[#374151] capitalize">{c.category}</td>
                              <td className="px-4 py-3 md:px-5 text-[#4B5563]">{c.location}</td>
                              <td className="px-4 py-3 md:px-5">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${
                                  c.status === 'ACTIVE'
                                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                                    : c.status === 'FOUND'
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : c.status === 'RECOVERY-IN-PROGRESS'
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 md:px-5 text-[#6B7280]">{formatTimeAgo(c.createdAt)}</td>
                              <td className="px-4 py-3 md:px-5 text-right">
                                <div className="flex justify-end gap-2">
                                  {c.disputed && c.status !== 'CLOSED' && (
                                    <Button variant="secondary" size="sm" className="text-[11px] px-3 py-1" onClick={() => setSelectedCase(c)}>
                                      Review
                                    </Button>
                                  )}
                                  {(c.status === 'ACTIVE' || c.status === 'FOUND') && c.itemType !== 'found' && (
                                    <Button
                                      variant="secondary" size="sm"
                                      className="text-[11px] px-3 py-1 text-red-700 border-red-200 hover:border-red-300"
                                      onClick={() => openForceCloseModal(c)}
                                    >
                                      Force Close
                                    </Button>
                                  )}
                                  <Button
                                    variant="secondary" size="sm"
                                    className="text-[11px] px-3 py-1 text-red-700 bg-red-50 border-red-300 hover:bg-red-100"
                                    onClick={() => handleDeleteItem(c)}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1 inline" />
                                    Delete
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
              </div>

              {/* Disputed Case Sidebar */}
              <div className="space-y-4">
                <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-[#1E293B]">Disputed Items</h2>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                      {disputedCases.length} open
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-4">
                    Admins work only with case metadata and dispute flags.
                  </p>

                  {disputedCases.length === 0 ? (
                    <p className="text-xs text-[#9CA3AF]">No disputed items at the moment.</p>
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
                            <span className="text-[11px] text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Disputed
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Disputed Case Detail */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {selectedCase && selectedCase.disputed ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#111827]">{selectedCase.title}</p>
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
                            <p className="text-[11px] font-semibold text-orange-800 mb-1">Item Description</p>
                            <p className="text-[11px] text-orange-700 leading-relaxed">{selectedCase.description}</p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button size="sm" className="flex-1 text-[11px]" disabled={actionLoading} onClick={() => handleVerifyAction('verify')}>
                            <Check className="w-3 h-3 mr-1 inline" /> Verify Owner Claim
                          </Button>
                          <Button size="sm" variant="secondary" className="flex-1 text-[11px] border-red-200 text-red-700 hover:border-red-300" disabled={actionLoading} onClick={() => handleVerifyAction('reject')}>
                            <XCircle className="w-3 h-3 mr-1 inline" /> Reject Claim
                          </Button>
                          <Button size="sm" variant="secondary" className="flex-1 text-[11px] border-blue-200 text-blue-700 hover:border-blue-300" disabled={actionLoading} onClick={() => handleVerifyAction('desk')}>
                            <HelpCircle className="w-3 h-3 mr-1 inline" /> Recommend Desk
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
          )}

          {/* ============================================================= */}
          {/* CLAIMS TAB */}
          {/* ============================================================= */}
          {activeTab === 'claims' && (
            <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-[#1E293B]">All Claims</h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {filteredClaims.length} of {claims.length} claims (Lost item claims + Found item claims)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <select
                    value={claimTypeFilter}
                    onChange={(e) => setClaimTypeFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                  >
                    <option value="ALL">Type: ALL</option>
                    <option value="lost">Type: LOST CLAIM</option>
                    <option value="found">Type: FOUND CLAIM</option>
                  </select>
                  <select
                    value={claimStatusFilter}
                    onChange={(e) => setClaimStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[#374151]"
                  >
                    <option value="ALL">Status: ALL</option>
                    <option value="pending">Status: PENDING</option>
                    <option value="approved">Status: APPROVED</option>
                    <option value="rejected">Status: REJECTED</option>
                  </select>
                </div>
              </div>

              {isLoadingClaims ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B] mx-auto mb-2" />
                  <p className="text-xs text-[#9CA3AF]">Loading claims…</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                  <table className="min-w-full text-left text-xs md:text-sm">
                    <thead className="bg-orange-50/60 text-[11px] uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3">Claim Type</th>
                        <th className="px-4 py-3">Claim ID</th>
                        <th className="px-4 py-3">Item ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Message</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
                            No claims found.
                          </td>
                        </tr>
                      ) : (
                        filteredClaims.map((c) => (
                          <tr key={c.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                c.claimType === 'found'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {c.claimType === 'found' ? 'Owner Claim' : 'Finder Claim'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                              {c.claimId.substring(0, 8)}…
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                              {c.itemId.substring(0, 12)}…
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${
                                c.status === 'pending'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : c.status === 'approved'
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : 'border-red-200 bg-red-50 text-red-700'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#6B7280] max-w-[160px] truncate">
                              {c.message || '—'}
                            </td>
                            <td className="px-4 py-3 text-[#6B7280]">{formatTimeAgo(c.createdAt)}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="secondary" size="sm"
                                className="text-[11px] px-3 py-1 text-red-700 bg-red-50 border-red-300 hover:bg-red-100"
                                onClick={() => handleDeleteClaim(c)}
                              >
                                <Trash2 className="w-3 h-3 mr-1 inline" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ============================================================= */}
          {/* CONVERSATIONS TAB */}
          {/* ============================================================= */}
          {activeTab === 'conversations' && (
            <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-[#1E293B]">All Conversations</h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {conversations.length} conversation thread{conversations.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {isLoadingConversations ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B] mx-auto mb-2" />
                  <p className="text-xs text-[#9CA3AF]">Loading conversations…</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                  <table className="min-w-full text-left text-xs md:text-sm">
                    <thead className="bg-orange-50/60 text-[11px] uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3">Conversation ID</th>
                        <th className="px-4 py-3">Item ID</th>
                        <th className="px-4 py-3">Participants</th>
                        <th className="px-4 py-3">Messages</th>
                        <th className="px-4 py-3">Last Message</th>
                        <th className="px-4 py-3">Last Activity</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-xs text-[#9CA3AF]">
                            No conversations found.
                          </td>
                        </tr>
                      ) : (
                        conversations.map((conv) => (
                          <tr key={conv.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                              {conv.id.substring(0, 16)}…
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                              {conv.itemId.substring(0, 12)}…
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[#4B5563]">
                              <div className="flex flex-col gap-0.5">
                                <span>A: {conv.participantA.substring(0, 8)}…</span>
                                <span>B: {conv.participantB.substring(0, 8)}…</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                                {conv.messageCount}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#6B7280] max-w-[160px] truncate">
                              {conv.lastMessage || '—'}
                            </td>
                            <td className="px-4 py-3 text-[#6B7280]">{formatTimeAgo(conv.lastMessageAt)}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="secondary" size="sm"
                                className="text-[11px] px-3 py-1 text-red-700 bg-red-50 border-red-300 hover:bg-red-100"
                                onClick={() => handleDeleteConversation(conv)}
                              >
                                <Trash2 className="w-3 h-3 mr-1 inline" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ============================================================= */}
          {/* AUDIT LOG TAB */}
          {/* ============================================================= */}
          {activeTab === 'auditLog' && (
            <Card className="p-5 md:p-6 bg-white/95 shadow-soft">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-[#1E293B]">Admin Audit Log</h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Persistent record of all admin deletion actions
                  </p>
                </div>
              </div>

              {isLoadingAuditLogs ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B] mx-auto mb-2" />
                  <p className="text-xs text-[#9CA3AF]">Loading audit logs…</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                  <p className="text-xs text-[#9CA3AF]">No admin actions recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                  <table className="min-w-full text-left text-xs md:text-sm">
                    <thead className="bg-orange-50/60 text-[11px] uppercase tracking-wide text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Target Type</th>
                        <th className="px-4 py-3">Target ID</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              log.actionType === 'delete_item'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : log.actionType === 'delete_claim'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {log.actionType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#4B5563] capitalize">{log.targetType}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[#4B5563]">
                            {log.targetId.substring(0, 12)}…
                          </td>
                          <td className="px-4 py-3 text-[#6B7280] max-w-[220px] truncate">
                            {log.details || '—'}
                          </td>
                          <td className="px-4 py-3 text-[#6B7280]">{log.adminUserId.substring(0, 8)}…</td>
                          <td className="px-4 py-3 text-[#6B7280]">{formatTimeAgo(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Force Close Confirmation Modal */}
        {showForceCloseModal && selectedCase && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-4">
            <Card className="max-w-md w-full bg-white shadow-2xl">
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">Force Close Case</h3>
              <p className="text-sm text-[#475569] mb-4">
                Close this case if it appears unresolved or abandoned.
              </p>
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-800">
                <p className="font-semibold mb-1">{selectedCase.title}</p>
                <p>{selectedCase.category} · {selectedCase.location} · {selectedCase.status}</p>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <Button
                  variant="secondary" size="sm" className="flex-1"
                  disabled={actionLoading}
                  onClick={() => { setShowForceCloseModal(false); setSelectedCase(null) }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm" className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={actionLoading}
                  onClick={handleForceClose}
                >
                  {actionLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1 inline" />Closing…</>
                  ) : (
                    'Force Close Case'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          show={deleteModal.show}
          title={deleteModal.title}
          details={deleteModal.details}
          loading={deleteLoading}
          onConfirm={deleteModal.onConfirm}
          onCancel={() => setDeleteModal({ show: false, title: '', details: '', onConfirm: null })}
        />
      </div>
    </Layout>
  )
}
