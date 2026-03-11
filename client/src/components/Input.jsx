import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const Input = forwardRef(({ 
  label,
  error,
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-[#475569] mb-2">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-4 py-3 rounded-xl
          bg-white border-2 border-gray-200
          text-[#1E293B] placeholder:text-gray-400
          focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20
          transition-all duration-200
          shadow-sm hover:shadow-md
          ${error ? 'border-red-300 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input