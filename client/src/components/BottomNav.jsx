import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, PlusCircle } from 'lucide-react'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const items = [
    { key: 'home', label: 'Home', icon: Home, path: '/home' },
    { key: 'feed', label: 'Items', icon: Search, path: '/feed' },
    { key: 'report', label: 'Report', icon: PlusCircle, path: '/report' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-[#FFF7ED]/95 border-t border-orange-100 backdrop-blur">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-full transition-colors ${
                isActive ? 'text-[#F59E0B]' : 'text-[#475569]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? '' : 'opacity-80'}`} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

