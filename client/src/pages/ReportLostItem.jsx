import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, Sparkles, AlertCircle, CheckCircle2, Phone, Briefcase, Gem, WalletCards, KeyRound, MoreHorizontal } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { createItemReport, checkForDuplicates } from '../services/itemService'
import { notifyNewLostItem } from '../services/notificationTriggers'
import { useNotificationCenter } from '../context/NotificationCenterContext'
import { notifyNewLostItemToCenter } from '../services/notificationCenterHelpers'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

const FORM_STORAGE_KEY = 'faithguard_report_draft'

export default function ReportLostItem() {
  const navigate = useNavigate()
  const { session, getTempleCode, isSessionValid } = useSession()
  const { addNotification } = useNotificationCenter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    type: 'lost',
    category: '',
    title: '',
    description: '',
    location: '',
    phoneNumber: '',
    image: null,
    hasReward: false,
    rewardAmount: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  // Load saved form data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setFormData(parsed)
      } catch (e) {
        // Invalid saved data, ignore
      }
    }
  }, [])

  // Save form data to localStorage as user types
  useEffect(() => {
    if (formData.title || formData.description || formData.location || formData.image) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData])

  // Validate session
  useEffect(() => {
    if (!isSessionValid()) {
      navigate('/checkin', { replace: true })
    }
  }, [isSessionValid, navigate])

  // Real-time validation
  const validateField = (field, value) => {
    const newErrors = { ...errors }

    switch (field) {
      case 'title':
        if (!value || value.trim().length < 3) {
          newErrors.title = 'Title must be at least 3 characters'
        } else if (value.length > 100) {
          newErrors.title = 'Title must be 100 characters or less'
        } else {
          delete newErrors.title
        }
        break
      case 'description':
        if (!value || value.trim().length < 10) {
          newErrors.description = 'Description must be at least 10 characters'
        } else if (value.length > 500) {
          newErrors.description = 'Description must be 500 characters or less'
        } else {
          delete newErrors.description
        }
        break
      case 'location':
        if (!value || value.trim().length === 0) {
          newErrors.location = 'Location is required'
        } else {
          delete newErrors.location
        }
        break
      case 'phoneNumber':
        if (!value || value.trim().length === 0) {
          newErrors.phoneNumber = 'Phone number is required'
        } else if (!/^\d{10,15}$/.test(value.trim())) {
          newErrors.phoneNumber = 'Enter a valid phone number (10-15 digits)'
        } else {
          delete newErrors.phoneNumber
        }
        break
      default:
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Debounced duplicate check
  useEffect(() => {
    const templeCode = getTempleCode()
    if (!templeCode) return

    const timeoutId = setTimeout(async () => {
      if (formData.title.trim().length >= 3 || formData.description.trim().length >= 10) {
        const duplicates = await checkForDuplicates(
          formData.title,
          formData.description,
          templeCode
        )
        if (duplicates.length > 0) {
          setDuplicateWarning({
            count: duplicates.length,
            items: duplicates,
          })
        } else {
          setDuplicateWarning(null)
        }
      } else {
        setDuplicateWarning(null)
      }
    }, 800) // 800ms debounce

    return () => clearTimeout(timeoutId)
  }, [formData.title, formData.description, getTempleCode])

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    validateField(field, value)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please upload an image file' })
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image must be less than 5MB' })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result })
        const newErrors = { ...errors }
        delete newErrors.image
        setErrors(newErrors)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null })
  }

  const handleContinue = () => {
    if (!formData.category) return
    setStep(2)
  }

  const handleSubmit = async (skipDuplicateCheck = false) => {
    // Final validation
    const isTitleValid = validateField('title', formData.title)
    const isDescValid = validateField('description', formData.description)
    const isLocationValid = validateField('location', formData.location)
    const isPhoneValid = validateField('phoneNumber', formData.phoneNumber)

    if (!isTitleValid || !isDescValid || !isLocationValid || !isPhoneValid) {
      return
    }

    // Check for duplicates one more time (unless skipping)
    if (!skipDuplicateCheck) {
      const templeCode = getTempleCode()
      if (templeCode) {
        const duplicates = await checkForDuplicates(
          formData.title,
          formData.description,
          templeCode
        )
        if (duplicates.length > 0) {
          setShowDuplicateDialog(true)
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      const templeCode = getTempleCode()
      if (!templeCode || !session) {
        throw new Error('Session invalid')
      }

      const result = await createItemReport(
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          image: formData.image,
          category: formData.category || 'other',
          rewardAmount: formData.hasReward && formData.rewardAmount ? parseFloat(formData.rewardAmount) : null,
          contactPhone: formData.phoneNumber.trim(),
        },
        session.sessionToken,
        templeCode
      )

      // Trigger notification for new lost item
      notifyNewLostItem(result.item, templeCode)
      
      // Add to notification center
      notifyNewLostItemToCenter(addNotification, result.item, templeCode)

      // Clear saved form data
      localStorage.removeItem(FORM_STORAGE_KEY)

      // Navigate to feed
      navigate('/feed')
    } catch (error) {
      console.error('Failed to submit report:', error)
      setErrors({ ...errors, submit: 'Failed to submit report. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProceedWithDuplicate = () => {
    setShowDuplicateDialog(false)
    handleSubmit(true) // Skip duplicate check since user confirmed they want to proceed
  }

  const isFormValid = () => {
    // Only count errors with truthy values (ignore null/undefined entries)
    const realErrors = Object.values(errors).filter(Boolean)
    return (
      formData.title.trim().length >= 3 &&
      formData.title.trim().length <= 100 &&
      formData.description.trim().length >= 10 &&
      formData.description.trim().length <= 500 &&
      formData.location.trim().length > 0 &&
      /^\d{10,15}$/.test(formData.phoneNumber.trim()) &&
      realErrors.length === 0
    )
  }

  return (
    <Layout>
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#475569] hover:text-[#1E293B] mb-6 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-[#F59E0B]" />
              <h1 className="text-3xl md:text-4xl font-bold text-[#1E293B]">
                Report Item
              </h1>
            </div>
            <p className="text-[#475569] text-base md:text-lg">
              Help reconnect items with their owners
            </p>
          </motion.div>

          {/* Step 1: Type Selection */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl md:text-2xl font-semibold text-[#1E293B] mb-6">
                  What did you lose?
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'phone', label: 'Phone', icon: Phone },
                    { key: 'bag', label: 'Bag', icon: Briefcase },
                    { key: 'jewelry', label: 'Jewelry', icon: Gem },
                    { key: 'wallet', label: 'Wallet', icon: WalletCards },
                    { key: 'keys', label: 'Keys', icon: KeyRound },
                    { key: 'other', label: 'Other', icon: MoreHorizontal },
                  ].map((cat) => {
                    const Icon = cat.icon
                    const selected = formData.category === cat.key
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.key })}
                        className={`flex flex-col items-center justify-center px-3 py-4 rounded-2xl border text-xs font-medium transition-colors ${
                          selected
                            ? 'border-[#F59E0B] bg-white text-[#1E293B] shadow-md'
                            : 'border-gray-200 bg-white/70 text-[#475569] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${selected ? 'text-[#F59E0B]' : 'text-gray-400'}`} />
                        <span>{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    size="lg"
                    disabled={!formData.category}
                    onClick={handleContinue}
                    className="w-full mt-6"
                  >
                    Continue
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Details Form */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-orange-800 mb-1">
                        Similar items found
                      </p>
                      <p className="text-xs text-orange-700">
                        {duplicateWarning.count} similar item(s) already reported. Please check the feed to avoid duplicates.
                      </p>
                    </div>
                  </motion.div>
                )}

                <Card>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Item Title *
                        <span className="text-xs text-gray-400 ml-2">
                          ({formData.title.length}/100)
                        </span>
                      </label>
                      <Input
                        placeholder="e.g., Black Leather Wallet"
                        value={formData.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className={errors.title ? 'border-red-300' : ''}
                      />
                      {errors.title && (
                        <p className="text-xs text-red-600 mt-1">{errors.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Description *
                        <span className="text-xs text-gray-400 ml-2">
                          ({formData.description.length}/500)
                        </span>
                      </label>
                      <textarea
                        placeholder="Describe the item in detail... Include color, size, brand, unique features, etc."
                        value={formData.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl bg-white border-2 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 min-h-[120px] resize-none transition-all ${
                          errors.description ? 'border-red-300' : 'border-gray-200 focus:border-[#F59E0B]'
                        }`}
                      />
                      {errors.description && (
                        <p className="text-xs text-red-600 mt-1">{errors.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Location Lost *
                      </label>
                      <Input
                        placeholder="e.g., Main entrance, Meditation hall, Courtyard"
                        value={formData.location}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        className={errors.location ? 'border-red-300' : ''}
                      />
                      {errors.location && (
                        <p className="text-xs text-red-600 mt-1">{errors.location}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        placeholder="e.g., 9876543210"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          handleFieldChange('phoneNumber', value)
                        }}
                        className={errors.phoneNumber ? 'border-red-300' : ''}
                      />
                      <p className="text-xs text-[#64748B] mt-1">Only visible to temple administrators for emergency contact.</p>
                      {errors.phoneNumber && (
                        <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Photo (Optional)
                      </label>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-[#F59E0B]/50 transition-colors cursor-pointer bg-gradient-to-br from-gray-50 to-white"
                      >
                        {formData.image ? (
                          <div className="relative">
                            <img
                              src={formData.image}
                              alt="Preview"
                              className="max-h-48 mx-auto rounded-xl shadow-lg"
                            />
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleRemoveImage}
                              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-red-50 transition-colors"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </motion.button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <div>
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                              </motion.div>
                              <p className="text-sm text-[#475569] font-medium">
                                Tap to upload a photo
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Helps others identify the item (max 5MB)
                              </p>
                            </div>
                          </label>
                        )}
                      </motion.div>
                      {errors.image && (
                        <p className="text-xs text-red-600 mt-1">{errors.image}</p>
                      )}
                    </div>

                    {/* Optional Gratitude Reward Section */}
                    <div className="pt-6 border-t border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="hasReward"
                          checked={formData.hasReward}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              hasReward: e.target.checked,
                              rewardAmount: e.target.checked ? formData.rewardAmount : '',
                            })
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-[#F59E0B] focus:ring-[#F59E0B] focus:ring-2"
                        />
                        <label htmlFor="hasReward" className="text-sm font-semibold text-[#475569] cursor-pointer">
                          Declare a gratitude reward (optional)
                        </label>
                      </div>

                      {formData.hasReward && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-sm font-semibold text-[#475569] mb-2">
                              Reward Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#475569] font-medium">
                                ₹
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={formData.rewardAmount}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, '')
                                  setFormData({ ...formData, rewardAmount: value })
                                }}
                                className="pl-10"
                              />
                            </div>
                            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                              This is optional and offered as gratitude after return. No bargaining or pressure allowed.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </Card>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!isFormValid() || isSubmitting}
                    onClick={handleSubmit}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Duplicate Confirmation Dialog */}
      <AnimatePresence>
        {showDuplicateDialog && duplicateWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDuplicateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                    Similar Items Found
                  </h3>
                  <p className="text-sm text-[#475569]">
                    {duplicateWarning.count} similar item(s) have already been reported. Are you sure this is a different item?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDuplicateDialog(false)}
                  className="flex-1"
                >
                  Check Feed First
                </Button>
                <Button
                  onClick={handleProceedWithDuplicate}
                  className="flex-1"
                >
                  Yes, Proceed
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
