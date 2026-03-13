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
  Lock,
  Eye,
  ShieldCheck,
  ShieldX,
  Locate,
  Navigation2,
  X,
  Camera,
  ImagePlus,
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import {
  getFoundItemById,
  getMessagesForConversation,
  getConversationsForItem,
  addMessageToItem,
  getFoundClaimStatus,
  getFoundClaimsForItem,
  submitFoundClaim,
  approveFoundClaim as approveFoundClaimAPI,
  rejectFoundClaim as rejectFoundClaimAPI,
  updateFoundItemStatusAPI,
  toggleFoundItemLocationSharing,
} from '../services/itemService'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

const statusConfig = {
  found: {
    icon: CheckCircle2,
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Found',
  },
  'recovery-in-progress': {
    icon: ShieldCheck,
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Recovery',
  },
  closed: {
    icon: XCircle,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    label: 'Closed',
  },
}

const categoryEmoji = {
  phone: '📱', bag: '👜', jewelry: '💍', wallet: '👛', keys: '🔑', other: '📦',
}

// Compress image to max 800px / JPEG 0.75 before uploading
function compressImage(file, maxDim = 800, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}


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

export default function FoundItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, isSessionValid } = useSession()
  const [item, setItem] = useState(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [selectedPeer, setSelectedPeer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const messagesEndRef = useRef(null)

  // Claim state
  const [myClaim, setMyClaim] = useState(null)
  const [itemClaims, setItemClaims] = useState([])
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [claimPhoto, setClaimPhoto] = useState(null)
  const [claimPhotoPreview, setClaimPhotoPreview] = useState(null)
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)

  // Location sharing state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isTogglingLocation, setIsTogglingLocation] = useState(false)

  const isFinder = item && session && item.finderSessionId === session.sessionToken

  // Load data
  useEffect(() => {
    if (!isSessionValid()) {
      navigate('/checkin', { replace: true })
      return
    }

    const loadData = async () => {
      const itemData = await getFoundItemById(id)
      if (!itemData) {
        navigate('/feed')
        return
      }
      setItem(itemData)

      const currentIsFinder = itemData.finderSessionId === session?.sessionToken

      if (currentIsFinder) {
        // Finder: load claims and conversations
        const claims = await getFoundClaimsForItem(id)
        setItemClaims(claims)

        const convos = await getConversationsForItem(id)
        // Merge approved owners into conversations
        const approvedOwners = claims
          .filter(c => c.status === 'approved')
          .map(c => c.ownerSessionId)
        const existingPeers = new Set(convos.map(c => c.peerSessionId))
        const virtualConvos = approvedOwners
          .filter(sid => !existingPeers.has(sid))
          .map(sid => ({
            conversationId: `virtual-${sid}`,
            peerSessionId: sid,
            lastMessage: 'Claim approved — start chatting!',
            lastMessageAt: new Date().toISOString(),
            messageCount: 0,
          }))
        setConversations([...convos, ...virtualConvos])

        if (selectedPeer) {
          const convoMessages = await getMessagesForConversation(id, selectedPeer)
          setMessages(convoMessages)
        }
      } else {
        // Owner: load own claim status
        const claimData = await getFoundClaimStatus(id)
        setMyClaim(claimData)

        // Load chat if claim approved
        if (claimData?.status === 'approved') {
          const peerSid = itemData.finderSessionId
          if (peerSid) {
            const convoMessages = await getMessagesForConversation(id, peerSid)
            setMessages(convoMessages)
          }
        }
      }
      setIsLoading(false)
    }

    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [id, isSessionValid, navigate, selectedPeer, session?.sessionToken])

  // Redirect owner when case is closed
  useEffect(() => {
    if (!item || !session || isLoading) return
    if (item.status === 'closed' && !isFinder && myClaim?.status === 'approved') {
      navigate('/closed')
    }
  }, [item?.status, isFinder, myClaim?.status, isLoading])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !session || !item) return
    const receiverSid = isFinder ? selectedPeer : item.finderSessionId
    if (!receiverSid) {
      alert('Cannot send message: no recipient found.')
      return
    }
    try {
      await addMessageToItem(item.id || item.foundId, message, receiverSid)
      const updatedMessages = await getMessagesForConversation(item.id || item.foundId, receiverSid)
      setMessages(updatedMessages)
      setMessage('')
    } catch (error) {
      alert('Failed to send message: ' + error.message)
    }
  }

  // Handle photo selection — compress before storing
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      alert('Photo must be under 20MB')
      return
    }
    // Show preview immediately from original
    const reader = new FileReader()
    reader.onload = (ev) => setClaimPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
    // Compress in background and store the compressed blob
    const compressed = await compressImage(file)
    setClaimPhoto(new File([compressed], file.name, { type: 'image/jpeg' }))
  }

  // Submit claim
  const handleSubmitClaim = async () => {
    if (isSubmittingClaim) return
    setIsSubmittingClaim(true)
    try {
      const claim = await submitFoundClaim(item.id || item.foundId, claimMessage, claimPhoto)
      setMyClaim(claim)
      setShowClaimForm(false)
      setClaimMessage('')
      setClaimPhoto(null)
      setClaimPhotoPreview(null)
    } catch (error) {
      alert('Failed to submit claim: ' + error.message)
    } finally {
      setIsSubmittingClaim(false)
    }
  }

  const handleApproveClaim = async (claimId) => {
    try {
      await approveFoundClaimAPI(claimId)
    } catch (error) {
      alert('Failed to approve claim: ' + error.message)
    }
  }

  const handleRejectClaim = async (claimId) => {
    try {
      await rejectFoundClaimAPI(claimId)
    } catch (error) {
      alert('Failed to reject claim: ' + error.message)
    }
  }

  // Location sharing
  const handleToggleLocation = async (share) => {
    setIsTogglingLocation(true)
    try {
      await toggleFoundItemLocationSharing(item.id || item.foundId, share)
      setItem({ ...item, locationShared: share })
      setIsLocationModalOpen(false)
    } catch (error) {
      alert('Failed to update location: ' + error.message)
    } finally {
      setIsTogglingLocation(false)
    }
  }

  // Close case
  const handleCloseCase = async () => {
    if (!window.confirm('Are you sure you want to close this case? The item has been returned.')) return
    setIsClosing(true)
    try {
      await updateFoundItemStatusAPI(item.id || item.foundId, 'closed')
      setItem({ ...item, status: 'closed' })
    } catch (error) {
      alert('Failed to close case: ' + error.message)
    } finally {
      setIsClosing(false)
    }
  }

  // Can the current user see the location?
  // Location visible to: finder always, owner after claim approval
  const canSeeLocation = isFinder || myClaim?.status === 'approved'

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

  if (!item) return null

  const status = statusConfig[item.status] || statusConfig.found
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
              onClick={() => navigate(-1)}
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
                  {/* Image or Icon */}
                  <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center shadow-lg overflow-hidden relative">
                    {item.image ? (
                      <>
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          style={(isFinder || item.imageApproved || myClaim?.status === 'approved') ? {} : { filter: 'blur(20px)', transform: 'scale(1.1)' }}
                        />
                        {!(isFinder || item.imageApproved || myClaim?.status === 'approved') && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-2xl">
                            <Eye className="w-8 h-8 text-white drop-shadow-lg mb-1" />
                            <span className="text-sm font-semibold text-white drop-shadow-lg">Photo Under Review</span>
                            <span className="text-xs text-white/80 drop-shadow mt-1">Blurred for privacy until admin approval</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-7xl">{categoryEmoji[item.category] || '📦'}</span>
                    )}
                  </div>

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
                    {isFinder && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 mb-3">
                        ✦ Posted by me
                      </span>
                    )}

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-[#475569]">
                        <MapPin className="w-5 h-5 text-[#F59E0B]" />
                        <span className="font-medium">Location found:</span>
                        {canSeeLocation ? (
                          <span>{item.locationFound}</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-gray-400 italic">
                            <Lock className="w-3.5 h-3.5" />
                            Hidden until claim approval
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[#475569]">
                        <Clock className="w-5 h-5 text-[#F59E0B]" />
                        <span className="font-medium">Reported:</span>
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#475569]">
                        <Package className="w-5 h-5 text-[#F59E0B]" />
                        <span className="font-medium">Category:</span>
                        <span className="capitalize">{item.category || 'Other'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Sharing (finder only, after claim approved) */}
                  {isFinder && (item.status === 'recovery-in-progress' || item.status === 'found') && itemClaims.some(c => c.status === 'approved') && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <Navigation2 className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-800">Location Sharing</p>
                            <p className="text-xs text-orange-700">
                              Share the location where you found the item with the owner.
                            </p>
                          </div>
                        </div>
                        {item.locationShared ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              Location shared with owner
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleLocation(false)}
                              disabled={isTogglingLocation}
                              className="text-red-600 border-red-200"
                            >
                              <XCircle className="w-4 h-4 mr-1 inline" />
                              Stop
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setIsLocationModalOpen(true)}
                            className="w-full"
                            disabled={isTogglingLocation}
                          >
                            <Locate className="w-4 h-4 mr-2 inline" />
                            Share Location
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Claim & Actions */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">

                    {/* Non-finder (owner): Claim button or status */}
                    {item.status === 'found' && !isFinder && (
                      <>
                        {!myClaim && !showClaimForm && (
                          <Button
                            onClick={() => setShowClaimForm(true)}
                            className="w-full"
                          >
                            <ShieldCheck className="w-5 h-5 mr-2 inline" />
                            Claim This Item
                          </Button>
                        )}

                        {/* Claim form */}
                        {showClaimForm && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-blue-800">Claim This Item</h3>
                              <button onClick={() => { setShowClaimForm(false); setClaimMessage(''); setClaimPhoto(null); setClaimPhotoPreview(null) }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1">
                                Describe your item to verify ownership *
                              </label>
                              <textarea
                                value={claimMessage}
                                onChange={(e) => setClaimMessage(e.target.value)}
                                placeholder="Describe the item details only you would know (brand, color, markings, contents)..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                                rows={4}
                              />
                            </div>

                            {/* Photo Upload (optional) */}
                            <div>
                              <label className="block text-xs font-medium text-blue-700 mb-1">
                                Upload verification photo (optional)
                              </label>
                              <p className="text-[11px] text-blue-600 mb-2">
                                Add a photo of the item, receipt, or proof of ownership to strengthen your claim.
                              </p>

                              {!claimPhotoPreview ? (
                                <div className="flex gap-2">
                                  <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-100/50 transition-colors">
                                    <Camera className="w-5 h-5 text-blue-600 mb-1" />
                                    <span className="text-[11px] font-medium text-blue-600">Take Photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={handlePhotoSelect}
                                      className="hidden"
                                    />
                                  </label>
                                  <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50/50 hover:bg-blue-100/50 transition-colors">
                                    <ImagePlus className="w-5 h-5 text-blue-600 mb-1" />
                                    <span className="text-[11px] font-medium text-blue-600">Upload from Gallery</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handlePhotoSelect}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="relative">
                                  <img
                                    src={claimPhotoPreview}
                                    alt="Verification photo preview"
                                    className="w-full h-40 object-cover rounded-xl border border-blue-200"
                                  />
                                  <button
                                    onClick={() => { setClaimPhoto(null); setClaimPhotoPreview(null) }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                                  >
                                    <X className="w-4 h-4 text-red-600" />
                                  </button>
                                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-600/90 backdrop-blur rounded-full text-[10px] text-white font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Photo selected
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button
                              onClick={handleSubmitClaim}
                              disabled={!claimMessage.trim() || isSubmittingClaim}
                              className="w-full"
                            >
                              {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
                            </Button>
                          </motion.div>
                        )}

                        {/* Claim status badges */}
                        {myClaim?.status === 'pending' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <p className="text-sm text-amber-800 font-medium">
                              Your claim is pending review by the finder.
                            </p>
                          </div>
                        )}
                        {myClaim?.status === 'approved' && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="text-sm text-green-800 font-semibold">
                                Claim approved!
                              </p>
                              <p className="text-xs text-green-700 mt-1">
                                You can now chat with the finder to arrange the handover.
                                {item.locationShared ? ' Location has been shared.' : ' Location will be shared when the finder consents.'}
                              </p>
                            </div>
                          </div>
                        )}
                        {myClaim?.status === 'rejected' && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <ShieldX className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-800 font-medium">
                              Your claim was rejected by the finder.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Finder: Review pending claims */}
                    {isFinder && itemClaims.filter(c => c.status === 'pending').length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <h3 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
                          <Eye className="w-4 h-4 text-[#F59E0B]" />
                          Pending Claims ({itemClaims.filter(c => c.status === 'pending').length})
                        </h3>
                        {itemClaims.filter(c => c.status === 'pending').map((claim) => (
                          <div key={claim.claimId} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                            {claim.message && (
                              <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">Ownership Description:</p>
                                <p className="text-sm text-gray-700 italic">"{claim.message}"</p>
                              </div>
                            )}
                            {claim.verificationPhoto && (
                              <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">Verification Photo:</p>
                                <img
                                  src={claim.verificationPhoto}
                                  alt="Verification photo from claimant"
                                  className="w-full h-40 object-cover rounded-xl border border-amber-200"
                                />
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              Submitted {formatTimeAgo(claim.createdAt)}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproveClaim(claim.claimId)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1 inline" />
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => handleRejectClaim(claim.claimId)}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-1 inline" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Close case — finder only, after recovery-in-progress */}
                    {(item.status === 'recovery-in-progress' || item.status === 'found') && isFinder && itemClaims.some(c => c.status === 'approved') && (
                      <Button
                        onClick={handleCloseCase}
                        disabled={isClosing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2 inline" />
                        {isClosing ? 'Closing...' : 'Item Returned — Close Case'}
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
              {/* Gate chat: both sides need an approved claim */}
              {((!isFinder && myClaim?.status !== 'approved') ||
                (isFinder && itemClaims.filter(c => c.status === 'approved').length === 0)) ? (
                <Card className="flex-1 flex flex-col min-h-[500px] items-center justify-center text-center">
                  <Lock className="w-12 h-12 text-gray-300 mb-4" />
                  <h2 className="text-lg font-semibold text-[#1E293B] mb-2">Chat Locked</h2>
                  <p className="text-sm text-[#475569] max-w-xs">
                    {isFinder
                      ? 'Chat will unlock once you approve a claim.'
                      : 'Submit a claim and get it approved by the finder to start chatting.'}
                  </p>
                </Card>
              ) : (
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

                {/* Finder: Conversation List View */}
                {isFinder && !selectedPeer && (
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
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Thread View */}
                {(!isFinder || selectedPeer) && (
                  <>
                    {isFinder && selectedPeer && (
                      <button
                        onClick={() => { setSelectedPeer(null); setMessages([]) }}
                        className="flex items-center gap-1 text-sm text-[#475569] hover:text-[#1E293B] mb-3 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to conversations
                      </button>
                    )}

                    <div className="flex-1 space-y-4 mb-6 overflow-y-auto pr-2 max-h-[400px]">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          <p className="text-sm">No messages yet.</p>
                          <p className="text-xs mt-2">
                            {isFinder
                              ? 'No messages in this conversation yet.'
                              : 'Start a conversation to arrange the handover.'}
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
                                  <p className={`text-xs mt-2 ${isMyMessage ? 'text-white/70' : 'text-gray-500'}`}>
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
                            isFinder
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
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Location Sharing Consent Modal */}
      <AnimatePresence>
        {isLocationModalOpen && (
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
                  <h3 className="text-lg font-semibold text-[#1E293B]">Share Item Location</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    This will share the location where you found the item with the verified owner.
                  </p>
                  <ul className="text-xs text-[#475569] space-y-1">
                    <li>• Only visible to the approved claimant</li>
                    <li>• You can stop sharing anytime</li>
                    <li>• Helps with the handover process</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Button
                  onClick={() => handleToggleLocation(true)}
                  className="flex-1"
                  disabled={isTogglingLocation}
                >
                  <Locate className="w-4 h-4 mr-2 inline" />
                  {isTogglingLocation ? 'Sharing...' : 'Share Location'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="flex-1"
                  disabled={isTogglingLocation}
                >
                  Skip (Use Lost & Found Desk)
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
