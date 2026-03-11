import { useSession } from '../context/SessionContext'
import NotificationIcon from './NotificationIcon'
import NotificationPanel from './NotificationPanel'

export default function TopHeader() {
  const { session } = useSession()

  // Only show header when user is logged in (has session)
  if (!session) {
    return null
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#1E293B]">FaithGuard</h1>
          </div>
          <NotificationIcon />
        </div>
      </header>
      <NotificationPanel />
    </>
  )
}
