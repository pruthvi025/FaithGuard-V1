import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Clock, ArrowRight, RefreshCw, AlertCircle, Heart } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { getItemsForTemple } from '../services/itemService'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import BottomNav from '../components/BottomNav'

function formatTimeAgo(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) {
    const m = Math.floor(diffInSeconds / 60)
    return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`
  }
  if (diffInSeconds < 86400) {
    const h = Math.floor(diffInSeconds / 3600)
    return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  }
  const d = Math.floor(diffInSeconds / 86400)
  return `${d} ${d === 1 ? 'day' : 'days'} ago`
}

const categoryEmoji = {
  phone: '📱',
  bag: '👜',
  jewelry: '💍',
  wallet: '👛',
  keys: '🔑',
  other: '📦',
}

export default function CheckBeforeReportFound() {
  const navigate = useNavigate()
  const { getTempleCode } = useSession()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadItems = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    const templeCode = getTempleCode()
    if (templeCode) {
      try {
        const lostItems = await getItemsForTemple(templeCode)
        const active = lostItems
          .filter((i) => i.status === 'active')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setItems(active)
      } catch {
        setItems([])
      }
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <Layout>
      <div className="min-h-screen pb-24 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#475569] hover:text-[#1E293B] mb-6 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back
          </motion.button>

          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 text-white shadow-xl mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-widest opacity-90">
                  Step 1 of 2
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 leading-snug">
                Check if someone has already<br />reported this item lost 🔎
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                If the owner already reported it, you can connect with them directly. Otherwise, report the item found below.
              </p>
            </div>

            {/* Proceed CTA */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <button
                onClick={() => navigate('/report-found')}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors group"
              >
                <span>Not listed → Report Found Item</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>

          {/* Lost Items Feed */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1E293B]">Active Lost Item Reports</h2>
            <button
              onClick={() => loadItems(true)}
              disabled={refreshing}
              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-gray-200 text-[#475569] hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 mx-auto mb-3 border-4 border-gray-200 border-t-indigo-500 rounded-full"
              />
              <p className="text-[#475569]">Loading lost reports…</p>
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-[#475569] font-medium mb-2">No active lost reports found</p>
              <p className="text-sm text-gray-400 mb-6">
                The owner hasn't reported it yet. Be the first to help!
              </p>
              <Button onClick={() => navigate('/report-found')} size="lg">
                Report Found Item
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center flex-shrink-0 text-2xl shadow-sm">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          categoryEmoji[item.category] || '📦'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-[#1E293B] truncate">{item.title}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 flex-shrink-0">
                            Lost
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] mt-1 line-clamp-2">{item.description}</p>
                        {item.rewardAmount && (
                          <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            Reward: ₹{item.rewardAmount}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {/* Bottom CTA repeated */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: items.length * 0.05 + 0.1 }}
                className="pt-2"
              >
                <button
                  onClick={() => navigate('/report-found')}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors group"
                >
                  <span>Not listed → Report Found Item</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </Layout>
  )
}
