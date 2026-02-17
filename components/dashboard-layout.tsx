"use client"

import React from "react"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import type { UserRole } from "@/lib/auth-helpers"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  LayoutDashboard,
  Dumbbell,
  Trophy,
  Briefcase,
  User,
  MessageSquare,
  Bell,
  LogOut,
  Users,
  ClipboardList,
  CheckCircle,
  Calendar,
  FileText,
  Settings,
  Menu,
  X,
} from "lucide-react"
import { useState, useEffect } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
  role?: UserRole
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  athlete: [
    { label: "Dashboard", href: "/athlete", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Training", href: "/athlete/training", icon: <Dumbbell className="h-4 w-4" /> },
    { label: "Achievements", href: "/athlete/achievements", icon: <Trophy className="h-4 w-4" /> },
    { label: "Opportunities", href: "/athlete/opportunities", icon: <Briefcase className="h-4 w-4" /> },
    { label: "Profile", href: "/athlete/profile", icon: <User className="h-4 w-4" /> },
  ],
  coach: [
    { label: "Dashboard", href: "/coach", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Athletes", href: "/coach/athletes", icon: <Users className="h-4 w-4" /> },
    { label: "Training Plans", href: "/coach/training-plans", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "Profile", href: "/coach/profile", icon: <User className="h-4 w-4" /> },
  ],
  official: [
    { label: "Dashboard", href: "/official", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Verifications", href: "/official/verifications", icon: <CheckCircle className="h-4 w-4" /> },
    { label: "Opportunities", href: "/official/opportunities", icon: <Trophy className="h-4 w-4" /> },
    { label: "Shortlisted Athletes", href: "/official/shortlisted", icon: <Users className="h-4 w-4" /> },
    { label: "History", href: "/official/history", icon: <FileText className="h-4 w-4" /> },
    { label: "Profile", href: "/official/profile", icon: <User className="h-4 w-4" /> },
    { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  ],
  specialist: [
    { label: "Dashboard", href: "/specialist", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Consultations", href: "/specialist/consultations", icon: <Calendar className="h-4 w-4" /> },
    { label: "Profile", href: "/specialist/profile", icon: <User className="h-4 w-4" /> },
  ],
}

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch(`/api/users?role=${role}&limit=1`, { cache: "no-store" })
        const data = await res.json()
        setCurrentUser(data.users?.[0] || null)
      } catch (error) {
        console.error("Failed to load user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [role])

  useEffect(() => {
    if (!currentUser) return

    const loadNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUser.id}`, { cache: "no-store" })
        const data = await res.json()
        const unread = (data.notifications || []).filter((n: any) => !n.read).length
        setUnreadNotifications(unread)
      } catch (error) {
        console.error("Failed to load notifications", error)
      }
    }

    loadNotifications()
  }, [currentUser])

  if (isLoadingUser) return null
  if (!currentUser) return null
  
  const navItems = roleNavItems[role]
  const unreadMessages = 0
  
  const handleLogout = () => {
    router.push("/")
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <Link href={`/${role}`} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground hidden sm:block">Unified Athlete</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Messages */}
            <Link href="/messages">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <MessageSquare className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {/* Notifications */}
            <Link href={`/${role}/notifications`}>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground text-xs">
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {currentUser.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-foreground">{currentUser.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                </div>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild>
                  <Link href={`/${role}/profile`} className="cursor-pointer text-foreground">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-card p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      
      {/* Main Content */}
      <main className="p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
