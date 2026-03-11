import { motion } from 'framer-motion'
import { forwardRef } from 'react'

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const baseStyles = 'font-semibold rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 relative overflow-hidden'
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#FDBA74] to-[#F59E0B] text-white shadow-lg hover:shadow-xl focus:ring-primary',
    secondary: 'bg-white text-[#1E293B] border-2 border-gray-200 hover:border-primary/30 shadow-sm hover:shadow-md',
    ghost: 'bg-transparent text-[#1E293B] hover:bg-white/50',
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <motion.button
      ref={ref}
      whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      style={{ pointerEvents: disabled ? 'none' : 'auto' }}
      {...props}
    >
      {/* Subtle shine effect */}
      {variant === 'primary' && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
})

Button.displayName = 'Button'

export default Button