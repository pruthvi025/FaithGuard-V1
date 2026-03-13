import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, AlertCircle, Phone, Briefcase, Gem, WalletCards, KeyRound, MoreHorizontal, MapPin, Clock, Upload, X } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { submitFoundItem } from '../services/itemService'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function ReportFoundItem() {
  const navigate = useNavigate()
  const { session, getTempleCode, isSessionValid } = useSession()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    locationFound: '',
    timeFound: '',
    image: null,
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!isSessionValid()) {
      navigate('/checkin', { replace: true })
    }
  }, [isSessionValid, navigate])

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    const newErrors = { ...errors }
    if (field === 'title' && value.trim().length >= 3) delete newErrors.title
    if (field === 'locationFound' && value.trim().length > 0) delete newErrors.locationFound
    delete newErrors.submit
    setErrors(newErrors)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title || formData.title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters'
    if (!formData.locationFound || formData.locationFound.trim().length === 0) newErrors.locationFound = 'Location is required'
    if (!formData.category) newErrors.category = 'Please select a category'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => {
    return (
      formData.category &&
      formData.title.trim().length >= 3 &&
      formData.locationFound.trim().length > 0
    )
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please upload an image file' })
        return
      }
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

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const templeCode = getTempleCode()
      if (!templeCode || !session) throw new Error('Session invalid')

      await submitFoundItem(
        formData.title.trim(),
        formData.category,
        formData.locationFound.trim(),
        formData.timeFound || new Date().toISOString(),
        formData.image
      )

      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit found item:', error)
      setErrors({ ...errors, submit: error.message || 'Failed to submit. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success screen
  if (submitted) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <Card className="p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
              >
                <Search className="w-10 h-10 text-green-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[#1E293B] mb-3">Found Item Reported!</h2>
              <p className="text-[#475569] mb-6">
                Your report has been saved. All temple visitors have been notified. If the owner is looking for this item, they'll be shown your report.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/feed')} className="w-full">
                  Browse Lost Items
                </Button>
                <Button variant="secondary" onClick={() => navigate('/home')} className="w-full">
                  Return to Home
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </Layout>
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
              <Search className="w-6 h-6 text-[#F59E0B]" />
              <h1 className="text-3xl md:text-4xl font-bold text-[#1E293B]">
                Report Found Item
              </h1>
            </div>
            <p className="text-[#475569] text-base md:text-lg">
              Found something at the temple? Report it so the owner can find it.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* Step 1: Category */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl md:text-2xl font-semibold text-[#1E293B] mb-6">
                  What did you find?
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Button
                    size="lg"
                    disabled={!formData.category}
                    onClick={() => setStep(2)}
                    className="w-full mt-6"
                  >
                    Continue
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card>
                  <div className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        Item Title *
                        <span className="text-xs text-gray-400 ml-2">({formData.title.length}/100)</span>
                      </label>
                      <Input
                        placeholder="e.g., Black Leather Wallet"
                        value={formData.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className={errors.title ? 'border-red-300' : ''}
                      />
                      {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
                    </div>

                    {/* Location Found */}
                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        <MapPin className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
                        Where did you find it? *
                      </label>
                      <Input
                        placeholder="e.g., Near shoe stand, Main hall, Courtyard bench"
                        value={formData.locationFound}
                        onChange={(e) => handleFieldChange('locationFound', e.target.value)}
                        className={errors.locationFound ? 'border-red-300' : ''}
                      />
                      {errors.locationFound && <p className="text-xs text-red-600 mt-1">{errors.locationFound}</p>}
                    </div>

                    {/* Time Found */}
                    <div>
                      <label className="block text-sm font-semibold text-[#475569] mb-3">
                        <Clock className="w-4 h-4 inline mr-1 text-[#F59E0B]" />
                        When did you find it? (optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={formData.timeFound}
                        onChange={(e) => setFormData({ ...formData, timeFound: e.target.value })}
                      />
                    </div>

                    {/* Photo Upload (Optional) */}
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
                  </div>
                </Card>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800">{errors.submit}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1" disabled={isSubmitting}>
                    Back
                  </Button>
                  <Button
                    size="lg"
                    disabled={!isFormValid() || isSubmitting}
                    onClick={handleSubmit}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Report Found Item'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}
