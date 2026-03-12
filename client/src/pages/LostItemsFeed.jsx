import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Clock, CheckCircle2, X, XCircle, Package, ArrowLeft, Filter, Heart, RefreshCw } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { getItemsForTemple } from '../services/itemService'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'

const statusConfig = {
  active: {
    icon: Clock,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    label: 'Active',
  },
  found: {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Found',
  },
  closed: {
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    label: 'Closed',
  },
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
}

export default function LostItemsFeed() {
  const navigate = useNavigate()
  const { getTempleCode } = useSession()
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredItems, setFilteredItems] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Reusable fetch function
  const loadItems = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    const templeCode = getTempleCode()
    if (templeCode) {
      const templeItems = await getItemsForTemple(templeCode)
      const sorted = templeItems.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
      setItems(sorted)
      setFilteredItems(sorted)
    }
    setLoading(false)
    setRefreshing(false)
  }

  // Manual refresh handler
  const handleRefresh = () => {
    if (refreshing) return // prevent duplicate calls
    loadItems(true)
  }

  // Load items on mount + auto-refresh every 5 seconds
  useEffect(() => {
    loadItems()
    const interval = setInterval(() => loadItems(), 5000)
    return () => clearInterval(interval)
  }, [getTempleCode])

  // Handle search + filters
  useEffect(() => {
    let result = items

    if (categoryFilter !== 'all') {
      result = result.filter((item) => (item.category || 'other') === categoryFilter)
    }

    if (locationFilter !== 'all') {
      result = result.filter((item) => item.location === locationFilter)
    }

    if (searchQuery.trim() !== '') {
      const term = searchQuery.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          (item.location || '').toLowerCase().includes(term),
      )
    }

    setFilteredItems(result)
  }, [searchQuery, items, categoryFilter, locationFilter])

  const uniqueLocations = Array.from(new Set(items.map((item) => item.location).filter(Boolean)))

  return (
    <Layout>
      <div className="min-h-screen pb-20 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-[#475569] hover:text-[#1E293B] mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-2">
                  Lost & Found
                </h1>
                <p className="text-[#475569] text-base md:text-lg">
                  Help reconnect items with their owners
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center text-[#475569] hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors shadow-sm disabled:opacity-50"
                  title="Refresh items"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => navigate('/report')}
                    className="flex items-center gap-2 shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Report Item
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Filters + Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-[#475569] mb-1">
                  <Filter className="w-3 h-3" />
                  <span>Filters</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 text-xs text-[#1E293B] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20"
                  >
                    <option value="all">All categories</option>
                    <option value="phone">Phone</option>
                    <option value="bag">Bag</option>
                    <option value="jewelry">Jewelry</option>
                    <option value="wallet">Wallet</option>
                    <option value="keys">Keys</option>
                    <option value="other">Other</option>
                  </select>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-gray-200 text-xs text-[#1E293B] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/20"
                  >
                    <option value="all">All locations</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20 transition-all duration-200 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-[#475569] mt-2">
                {filteredItems.length} item(s) found
              </p>
            )}
          </motion.div>

          {/* Items List */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 mx-auto mb-4 border-4 border-gray-200 border-t-[#F59E0B] rounded-full"
              />
              <p className="text-[#475569] text-lg">Loading items...</p>
            </motion.div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-4">
              {filteredItems.map((item, index) => {
                const status = statusConfig[item.status] || statusConfig.active
                const StatusIcon = status.icon

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Card
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            <Package className="w-10 h-10 text-gray-400" />
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg md:text-xl font-semibold text-[#1E293B]">
                              {item.title}
                            </h3>
                            <motion.span
                              whileHover={{ scale: 1.1 }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${status.bg} ${status.text} ${status.border} border flex-shrink-0`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </motion.span>
                          </div>
                          {/* Reward Badge - Only show if reward is declared and item is active */}
                          {item.rewardAmount && item.status === 'active' && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full mb-2"
                            >
                              <Heart className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-700">
                                Gratitude Reward: ₹{item.rewardAmount}
                              </span>
                            </motion.div>
                          )}
                          <p className="text-[#475569] text-sm md:text-base mb-2 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(item.createdAt)}
                            </span>
                            {item.location && (
                              <span className="truncate">📍 {item.location}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 mx-auto mb-6 text-gray-300"
              >
                <svg viewBox="0 0 100 100" fill="currentColor" opacity="0.3">
                  <rect x="25" y="70" width="50" height="10" />
                  <rect x="30" y="50" width="40" height="20" />
                  <polygon points="50,20 40,45 60,45" />
                </svg>
              </motion.div>
              <h3 className="text-2xl font-semibold text-[#1E293B] mb-2">
                {searchQuery ? 'No items found' : 'No items yet'}
              </h3>
              <p className="text-[#475569] mb-8 text-lg">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Be the first to report a lost item'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/report')} size="lg">
                  Report Item
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <BottomNav />
    </Layout>
  )
}
