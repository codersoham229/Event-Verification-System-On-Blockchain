import { NavBar } from "@/components/ui/tubelight-navbar"
import { 
  Home, 
  TicketCheck, 
  Plus, 
  QrCode, 
  LogOut,
  User as UserIcon
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useLocation } from 'wouter'

interface NavigationProps {
  currentPath?: string
}

export function Navigation({ currentPath = "/" }: NavigationProps) {
  const { user, signOut } = useAuth()
  const [, setLocation] = useLocation()

  const handleLogout = async () => {
    await signOut()
    setLocation('/login')
  }

  const navItems = [
    { name: 'Home', url: '/home', icon: Home },
    { name: 'Create Event', url: '/createevent', icon: Plus },
    { name: 'Generate Ticket', url: '/generateticket', icon: TicketCheck },
    { name: 'Verify Event', url: '/verifyevent', icon: QrCode },
    { name: 'Dashboard', url: '/dashboard', icon: UserIcon }
  ]

  return <NavBar items={navItems} />
}
