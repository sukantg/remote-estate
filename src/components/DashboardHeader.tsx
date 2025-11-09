import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import { 
  Globe, 
  LogOut,
  ChevronDown,
  User as UserIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Badge } from './ui/badge'

type Props = {
  user: any
  userType: 'seller' | 'buyer' | 'lawyer'
  onLogout: () => void
  activeTab?: string
  onTabChange?: (tab: string) => void
  tabs?: Array<{ id: string; label: string; badge?: number }>
  showNavigation?: boolean
}

export default function DashboardHeader({ 
  user, 
  userType, 
  onLogout, 
  activeTab, 
  onTabChange, 
  tabs,
  showNavigation = true 
}: Props) {
  const getUserTypeBadge = () => {
    switch (userType) {
      case 'seller':
        return { label: 'Seller', color: 'bg-blue-100 text-blue-800' }
      case 'buyer':
        return { label: 'Buyer', color: 'bg-purple-100 text-purple-800' }
      case 'lawyer':
        return { label: 'Verified Lawyer', color: 'bg-green-100 text-green-800' }
    }
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.name || user?.email || ''
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const badge = getUserTypeBadge()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#00985B] to-[#048853] rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-['Poppins'] text-[#048853] text-2xl">Remote Estate</h1>
              <p className="font-['Poppins'] text-xs text-gray-500">
                {userType === 'seller' && 'Seller Portal'}
                {userType === 'buyer' && 'Buyer Dashboard'}
                {userType === 'lawyer' && 'Legal Portal'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs (if provided) */}
          {showNavigation && tabs && tabs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 bg-gray-50 rounded-xl p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`relative px-4 py-2 rounded-lg font-['Poppins'] text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-[#00985B] shadow-sm'
                      : 'text-gray-600 hover:text-[#00985B] hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-2 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-[#00985B]">
                      <AvatarFallback className="bg-gradient-to-br from-[#00985B] to-[#048853] text-white font-['Poppins']">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden md:block">
                      <p className="font-['Poppins'] text-sm text-gray-900">
                        {user?.user_metadata?.name || 'User'}
                      </p>
                      <p className="font-['Poppins'] text-xs text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-['Poppins']">
                  <div className="flex flex-col gap-2">
                    <span>My Account</span>
                    <Badge className={`${badge.color} w-fit font-['Poppins'] text-xs`}>
                      {badge.label}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="font-['Poppins'] cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onLogout} 
                  className="font-['Poppins'] text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
