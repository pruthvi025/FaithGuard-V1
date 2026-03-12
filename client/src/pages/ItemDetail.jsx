import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  AlertCircle,
  XCircle,
  Navigation2,
  Locate,
  Heart,
  X,
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import {
  getItemById,
  updateItemStatus,
  updateItem,
  getMessagesForConversation,
  getConversationsForItem,
  addMessageToItem,
} from '../services/itemService'
import {
  notifyItemFound,
  notifyCaseStatusChange,
  notifyNewMessage,
} from '../services/notificationTriggers'
import { useNotificationCenter } from '../context/NotificationCenterContext'
import {
  notifyItemFoundToCenter,
  notifyCaseStatusChangeToCenter,
  notifyNewMessageToCenter,
} from '../services/notificationCenterHelpers'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

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

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, isSessionValid } = useSession()
  const { addNotification } = useNotificationCenter()
  const [item, setItem] = useState(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedPeer, setSelectedPeer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingFound, setIsMarkingFound] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [rewardGiven, setRewardGiven] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const messagesEndRef = useRef(null)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isLocationActive, setIsLocationActive] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [userPosition, setUserPosition] = useState(null)
  const [otherPosition] = useState(null) // placeholder until peer sharing is available
  const watchIdRef = useRef(null)

  const isReporter = item && session && item.reporterSessionId === session.sessionToken

  // Determine peerSessionId based on role
  const getPeerSessionId = (itemData) => {
    if (!itemData || !session) return null
    // Non-reporter always chats with the reporter
    if (itemData.reporterSessionId !== session.sessionToken) {
      return itemData.reporterSessionId
    }
    // Reporter uses the selected peer from conversation list
    return selectedPeer
  }

  // Load item and messages/conversations
  useEffect(() => {
    if (!isSessionValid()) {
      navigate('/checkin', { replace: true })
      return
    }

    const loadData = async () => {
      const itemData = await getItemById(id)
      if (!itemData) {
        navigate('/feed')
        return
      }

      setItem(itemData)

      const currentIsReporter = itemData.reporterSessionId === session?.sessionToken

      if (currentIsReporter) {
        // Reporter: load conversation list
        const convos = await getConversationsForItem(id)
        setConversations(convos)

        // If a peer is selected, load that conversation
        if (selectedPeer) {
          const convoMessages = await getMessagesForConversation(id, selectedPeer)
          setMessages(convoMessages)
        }
      } else {
        // Non-reporter: always chat with the reporter
        const peerSid = itemData.reporterSessionId
        if (peerSid) {
          const convoMessages = await getMessagesForConversation(id, peerSid)
          setMessages(convoMessages)
        }
      }

      setIsLoading(false)
    }

    loadData()

    // Refresh every 3 seconds for real-time updates
    const interval = setInterval(loadData, 3000)

    return () => clearInterval(interval)
  }, [id, isSessionValid, navigate, selectedPeer, session?.sessionToken])

  // Stop location sharing if status changes away from found or on unmount
  useEffect(() => {
    if (!item || item.status !== 'found') {
      stopLocationSharing()
    }
    return () => stopLocationSharing()
  }, [item?.status])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || !session || !item) return

    // Determine the receiver
    const receiverSid = isReporter ? selectedPeer : item.reporterSessionId
    if (!receiverSid) return

    try {
      const newMessage = await addMessageToItem(item.id, message, receiverSid)

      // Trigger notification for new message
      notifyNewMessage(item, newMessage, item.templeCode)
      
      // Add to notification center
      notifyNewMessageToCenter(addNotification, item, newMessage, item.templeCode)

      // Reload messages
      const updatedMessages = await getMessagesForConversation(item.id, receiverSid)
      setMessages(updatedMessages)
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleMarkAsFound = async () => {
    if (!item || !session) return

    setIsMarkingFound(true)
    try {
      const updatedItem = await updateItemStatus(item.id, 'found', session.sessionToken)
      setItem(updatedItem)
      
      // Trigger notification for item found
      notifyItemFound(updatedItem, item.templeCode)
      notifyCaseStatusChange(updatedItem, 'found', item.templeCode)
      
      // Add to notification center
      notifyItemFoundToCenter(addNotification, updatedItem, item.templeCode)
      notifyCaseStatusChangeToCenter(addNotification, updatedItem, 'found', item.templeCode)

      // Immediately show handover success / gratitude screen
      navigate('/closed')
    } catch (error) {
      console.error('Failed to mark as found:', error)
    } finally {
      setIsMarkingFound(false)
    }
  }

  const handleRemoveReward = async () => {
    if (!item || !session || !isReporter || item.status !== 'active') return
    
    if (!window.confirm('Are you sure you want to remove the reward? This will hide it from all users.')) {
      return
    }

    try {
      const updatedItem = await updateItem(item.id, { rewardAmount: null })
      setItem(updatedItem)
    } catch (error) {
      console.error('Failed to remove reward:', error)
    }
  }

  const handleCloseCase = async () => {
    if (!item || !session || !isReporter) return

    // If reward exists, show confirmation with reward checkbox
    if (item.rewardAmount && item.status === 'found') {
      setShowCloseConfirm(true)
      return
    }

    // Standard confirmation for cases without reward
    if (!window.confirm('Are you sure you want to close this case? This action cannot be undone.')) {
      return
    }

    await performCloseCase()
  }

  const performCloseCase = async () => {
    setIsClosing(true)
    try {
      const updates = { status: 'closed' }
      if (rewardGiven && item.rewardAmount) {
        updates.rewardGiven = true
      }
      
      const updatedItem = await updateItemStatus(item.id, 'closed', session.sessionToken)
      if (rewardGiven && item.rewardAmount) {
        await updateItem(item.id, { rewardGiven: true })
      }
      
      // Trigger notification for case closed
      notifyCaseStatusChange(updatedItem, 'closed', item.templeCode)
      
      // Add to notification center
      notifyCaseStatusChangeToCenter(addNotification, updatedItem, 'closed', item.templeCode)
      
      // Navigate to case closed page
      navigate('/closed')
    } catch (error) {
      console.error('Failed to close case:', error)
      setIsClosing(false)
    }
  }

  const startLocationSharing = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Location not supported in this browser. You can continue via chat or the Lost & Found Desk.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setIsLocationActive(true)
      },
      (error) => {
        setIsLocationActive(false)
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Permission denied. You can continue via chat or the Lost & Found Desk.')
        } else {
          setLocationError('Unable to get location right now. Please try again or use the desk.')
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    )

    watchIdRef.current = watchId
  }

  const stopLocationSharing = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsLocationActive(false)
    setUserPosition(null)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-[#F59E0B] border-t-transparent rounded-full"
          />
        </div>
      </Layout>
    )
  }

  if (!item) {
    return null
  }

  const status = statusConfig[item.status] || statusConfig.active
  const StatusIcon = status.icon

  return (
    <Layout>
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center gap-2 text-[#475569] hover:text-[#1E293B] mb-4 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Item Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Card>
                <div className="space-y-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="w-full h-80 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden shadow-lg"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-24 h-24 text-gray-400" />
                    )}
                  </motion.div>

                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <h1 className="text-2xl md:text-3xl font-bold text-[#1E293B]">
                        {item.title}
                      </h1>
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${status.bg} ${status.text} ${status.border} border flex-shrink-0`}
                      >
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </motion.span>
                    </div>
                    <p className="text-[#475569] mb-6 leading-relaxed text-base md:text-lg">
                      {item.description}
                    </p>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-[#475569]">
                        <MapPin className="w-5 h-5 text-[#F59E0B]" />
                        <span className="font-medium">Location:</span>
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#475569]">
                        <Clock className="w-5 h-5 text-[#F59E0B]" />
                        <span className="font-medium">Reported:</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Reward Display - Only show if reward is declared and item is active */}
                    {item.rewardAmount && item.status === 'active' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-800">
                              Gratitude Reward: ₹{item.rewardAmount}
                            </span>
                          </div>
                          {/* Remove reward button - Only for reporter */}
                          {isReporter && (
                            <button
                              onClick={handleRemoveReward}
                              className="p-1.5 rounded-full hover:bg-green-100 transition-colors"
                              aria-label="Remove reward"
                              title="Remove reward"
                            >
                              <X className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-green-700 leading-relaxed">
                          Reward is optional and offered after item return. No bargaining or pressure allowed.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Location Assistance (post-found only) */}
                  {item.status === 'found' && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <Navigation2 className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-800">Location Assistance</p>
                            <p className="text-xs text-orange-700">
                              Optional, consent-based, foreground-only. Helps with final handover after the item is found.
                            </p>
                          </div>
                        </div>

                        {!isLocationActive ? (
                          <div className="flex flex-col md:flex-row gap-3">
                            <Button
                              onClick={() => setIsLocationModalOpen(true)}
                              className="flex-1"
                            >
                              <Locate className="w-4 h-4 mr-2 inline" />
                              Share Location to Return Item
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setIsLocationModalOpen(true)}
                              className="flex-1"
                            >
                              Skip (Use Lost & Found Desk)
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Location sharing active
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-[#475569]">
                                  Foreground-only • Temporary • No storage
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={stopLocationSharing}
                                  className="text-red-600 border-red-200 hover:border-red-300"
                                >
                                  <XCircle className="w-4 h-4 mr-2 inline" />
                                  Stop Sharing
                                </Button>
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="text-sm font-semibold text-[#1E293B] mb-1">You</p>
                                  {userPosition ? (
                                    <p className="text-xs text-[#475569]">
                                      Approx: {userPosition.latitude.toFixed(5)}, {userPosition.longitude.toFixed(5)} • ±{Math.round(userPosition.accuracy)}m
                                    </p>
                                  ) : (
                                    <p className="text-xs text-[#475569]">Getting your position…</p>
                                  )}
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="text-sm font-semibold text-[#1E293B] mb-1">Other person</p>
                                  {otherPosition ? (
                                    <p className="text-xs text-[#475569]">
                                      Approx: {otherPosition.latitude.toFixed(5)}, {otherPosition.longitude.toFixed(5)}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-[#475569]">Awaiting their consent to share location</p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-[#475569]">
                                Simple walking guidance: meet at a safe, visible spot. You can also use the Lost & Found Desk anytime.
                              </div>
                            </div>
                          </div>
                        )}

                        {locationError && (
                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5" />
                            <span>{locationError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    {item.status === 'active' && !isReporter && (
                      <Button
                        onClick={handleMarkAsFound}
                        disabled={isMarkingFound}
                        className="w-full"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2 inline" />
                        {isMarkingFound ? 'Marking...' : 'I Found This Item'}
                      </Button>
                    )}

                    {item.status === 'found' && isReporter && (
                      <Button
                        onClick={handleCloseCase}
                        disabled={isClosing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2 inline" />
                        {isClosing ? 'Closing...' : 'Close Case - Item Returned'}
                      </Button>
                    )}

                    {item.status === 'active' && isReporter && (
                      <Button
                        variant="secondary"
                        onClick={handleCloseCase}
                        disabled={isClosing}
                        className="w-full"
                      >
                        <XCircle className="w-5 h-5 mr-2 inline" />
                        {isClosing ? 'Closing...' : 'Close Case (Found It Myself)'}
                      </Button>
                    )}

                    {item.status === 'closed' && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-800 font-medium">
                          This case has been closed. Item successfully returned!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Chat */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <Card className="flex-1 flex flex-col min-h-[500px]">
                {/* Safety Banner */}
                <div className="mb-4 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 flex items-start gap-2 text-xs text-orange-800">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    For your safety, do not share phone numbers, email, or personal details. Keep all coordination within this chat or through the temple desk.
                  </p>
                </div>
                <h2 className="text-xl font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Messages
                </h2>

                {/* Reporter: Conversation List View */}
                {isReporter && !selectedPeer && (
                  <div className="flex-1 overflow-y-auto pr-2 max-h-[400px]">
                    {conversations.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-sm">No conversations yet.</p>
                        <p className="text-xs mt-2">
                          Wait for someone to contact you about this item.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 mb-3">
                          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                        </p>
                        {conversations.map((conv) => (
                          <motion.button
                            key={conv.conversationId}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                              setSelectedPeer(conv.peerSessionId)
                              setMessages([])
                            }}
                            className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-[#F59E0B] hover:bg-orange-50 transition-all"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-[#1E293B]">
                                User ...{conv.peerSessionId.slice(-6)}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(conv.lastMessageAt)}
                              </span>
                            </div>
                            <p className="text-xs text-[#475569] truncate">
                              {conv.lastMessage}
                            </p>
                            <span className="text-xs text-gray-400 mt-1 block">
                              {conv.messageCount} message{conv.messageCount !== 1 ? 's' : ''}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Thread View (for non-reporter, or reporter with selected peer) */}
                {(!isReporter || selectedPeer) && (
                  <>
                    {/* Back button for reporter */}
                    {isReporter && selectedPeer && (
                      <button
                        onClick={() => {
                          setSelectedPeer(null)
                          setMessages([])
                        }}
                        className="flex items-center gap-1 text-sm text-[#475569] hover:text-[#1E293B] mb-3 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to conversations
                      </button>
                    )}

                    {/* Messages */}
                    <div className="flex-1 space-y-4 mb-6 overflow-y-auto pr-2 max-h-[400px]">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-sm">No messages yet.</p>
                          <p className="text-xs mt-2">
                            {isReporter
                              ? 'No messages in this conversation yet.'
                              : 'Start a conversation to verify ownership.'}
                          </p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {messages.map((msg, index) => {
                            const isMyMessage = msg.senderSessionId === session?.sessionToken
                            return (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index === messages.length - 1 ? 0.1 : 0 }}
                                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
                                    isMyMessage
                                      ? 'bg-gradient-to-r from-[#FDBA74] to-[#F59E0B] text-white'
                                      : 'bg-gray-100 text-[#1E293B]'
                                  }`}
                                >
                                  <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                                  <p
                                    className={`text-xs mt-2 ${
                                      isMyMessage ? 'text-white/70' : 'text-gray-500'
                                    }`}
                                  >
                                    {formatTimeAgo(msg.timestamp || msg.createdAt)}
                                  </p>
                                </motion.div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    {item.status !== 'closed' && (
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <Input
                          placeholder={
                            isReporter
                              ? 'Reply to this user...'
                              : 'Describe the item to verify ownership...'
                          }
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                          className="flex-1"
                        />
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={handleSend}
                            disabled={!message.trim()}
                            className="px-4"
                          >
                            <Send className="w-5 h-5" />
                          </Button>
                        </motion.div>
                      </div>
                    )}

                    {item.status === 'closed' && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-400 text-center">
                          This case is closed. Messaging is no longer available.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      {/* Consent Modal for Location Sharing */}
      <AnimatePresence>
        {isLocationModalOpen && item?.status === 'found' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsLocationModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Navigation2 className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-[#1E293B]">Share Location to Return Item</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    To help return the item faster, you may share your live location temporarily.
                  </p>
                  <ul className="text-xs text-[#475569] space-y-1">
                    <li>• Foreground only</li>
                    <li>• Temporary</li>
                    <li>• No storage</li>
                    <li>• Can stop anytime</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Button
                  onClick={() => {
                    setIsLocationModalOpen(false)
                    startLocationSharing()
                  }}
                  className="flex-1"
                >
                  <Locate className="w-4 h-4 mr-2 inline" />
                  Share Location
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsLocationModalOpen(false)
                    setLocationError(null)
                  }}
                  className="flex-1"
                >
                  Skip (Use Lost & Found Desk)
                </Button>
              </div>
              <p className="text-xs text-[#475569]">
                You can stop sharing anytime. If you prefer, meet at the Lost & Found Desk.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
