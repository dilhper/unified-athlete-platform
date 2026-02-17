import { create } from 'zustand'

export type UserRole = 'athlete' | 'coach' | 'official' | 'specialist'

export interface FileAttachment {
  id: string
  name: string
  type: 'image' | 'document'
  url: string
  size: number
  uploadedAt: string
}

export interface User {
  id: string
  email: string
  phone?: string
  name: string
  role: UserRole
  avatar?: string
  bio?: string
  sport?: string
  specialization?: string
  specialty?: string
  certifications?: string[]
  rating?: number
  profileVerified?: boolean
  profilePendingVerification?: boolean
  registrationVerified?: boolean
  registrationRejected?: boolean
  rejectionReason?: string
  verifiedBy?: string
  verifiedAt?: string
  isAdmin?: boolean
  athleteType?: 'student' | 'university' | 'normal'
  documents?: string[]
  location?: string
  yearsOfExperience?: number
  createdAt?: string
}

export interface TrainingPlan {
  id: string
  name: string
  description: string
  athleteIds: string[]
  coachId: string
  status: 'active' | 'completed' | 'paused'
  mode: 'physical' | 'online' | 'both'
  startDate: string
  endDate: string
  progress: number
  sessions: TrainingSession[]
  attachments?: FileAttachment[]
}

export interface TrainingSession {
  id: string
  name: string
  date: string
  completed: boolean
  mode?: 'physical' | 'online'
  notes?: string
  duration?: number
  description?: string
  attachments?: FileAttachment[]
  dailyForms?: DailyTrainingForm[]
}

export interface DailyTrainingForm {
  id: string
  athleteId: string
  sessionId: string
  date: string
  duration: number
  intensity: 'low' | 'medium' | 'high'
  exercises: string
  mood: 'poor' | 'fair' | 'good' | 'excellent'
  notes?: string
  evidence?: string
  attachments?: FileAttachment[]
  submittedAt: string
}

export interface Achievement {
  id: string
  athleteId: string
  title: string
  description: string
  date: string
  category: string
  status: 'pending' | 'verified' | 'rejected'
  evidence?: string
  attachments?: FileAttachment[]
  verifiedBy?: string
  verifiedDate?: string
}

export interface Certification {
  id: string
  coachId: string
  title: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  credentialId?: string
  status: 'pending' | 'verified' | 'rejected'
  attachments?: FileAttachment[]
  verifiedBy?: string
  verifiedDate?: string
  notes?: string
}

export interface Opportunity {
  id: string
  title: string
  organization: string
  type: 'scholarship' | 'competition' | 'sponsorship' | 'training'
  deadline: string
  description: string
  requirements: string[]
  status: 'open' | 'closed'
}

export interface Consultation {
  id: string
  athleteId: string
  specialistId: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled'
  type: string
  notes?: string
  priority: 'low' | 'medium' | 'high'
}

export interface SportRegistration {
  id: string
  athleteId: string
  sport: string
  coachId: string
  priority: number
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

export interface PhysiotherapySlot {
  id: string
  specialistId: string
  date: string
  time: string
  duration: number
  available: boolean
  bookedBy?: string
}

export interface PhysiotherapyAppointment {
  id: string
  athleteId: string
  slotId: string
  specialistId: string
  status: 'requested' | 'approved' | 'completed' | 'cancelled'
  reason: string
  notes?: string
  approvedBy?: string
  approvedDate?: string
}

export interface TrainingPlanPauseRequest {
  id: string
  planId: string
  athleteId: string
  coachId: string
  reason: 'medical' | 'event' | 'exam' | 'other'
  description: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedDate?: string
  medicalReferral?: boolean
  specialistId?: string
  attachments?: FileAttachment[]
}

export interface MedicalReferral {
  id: string
  athleteId: string
  coachId: string
  specialistId: string
  issue: string
  urgency: 'low' | 'medium' | 'high'
  status: 'active' | 'resolved'
  notes?: string
  createdDate: string
}

export interface Message {
  id: string
  senderId: string
  receiverId?: string // For direct messages
  communityId?: string // For community messages
  content: string
  timestamp: string
  read: boolean
}

export interface Community {
  id: string
  name: string
  description: string
  sport: string
  coachId: string
  memberIds: string[] // athletes in this community
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  timestamp: string
  link?: string
}

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const getDemoUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null

  const demoAuth = safeParse<{ email?: string; role?: UserRole; loggedInAt?: string }>(
    localStorage.getItem('demoAuth')
  )
  const demoUser = safeParse<{ name?: string; email?: string; role?: UserRole; createdAt?: string }>(
    localStorage.getItem('demoUser')
  )

  const role = demoUser?.role ?? demoAuth?.role
  if (!role) return null

  const baseUser = mockUsers.find(u => u.role === role)
  const name = demoUser?.name ?? baseUser?.name ?? 'Demo User'
  const email = demoUser?.email ?? demoAuth?.email ?? baseUser?.email ?? 'demo@example.com'

  return {
    ...(baseUser ?? { id: `demo-${role}`, role }),
    name,
    email
  }
}

export interface AppState {
  // Auth
  currentUser: User | null
  isAuthenticated: boolean
  
  // Data
  users: User[]
  trainingPlans: TrainingPlan[]
  achievements: Achievement[]
  certifications: Certification[]
  opportunities: Opportunity[]
  consultations: Consultation[]
  sportRegistrations: SportRegistration[]
  physiotherapySlots: PhysiotherapySlot[]
  physiotherapyAppointments: PhysiotherapyAppointment[]
  trainingPlanPauseRequests: TrainingPlanPauseRequest[]
  medicalReferrals: MedicalReferral[]
  messages: Message[]
  notifications: Notification[]
  communities: Community[]
  
  // Actions
  login: (email: string, password: string, role: UserRole) => boolean
  logout: () => void
  
  // User actions
  updateUser: (userId: string, updates: Partial<User>) => void
  
  // Training plan actions
  createTrainingPlan: (plan: Omit<TrainingPlan, 'id'>) => void
  updateTrainingPlan: (planId: string, updates: Partial<TrainingPlan>) => void
  completeSession: (planId: string, sessionId: string) => void
  
  // Achievement actions
  submitAchievement: (achievement: Omit<Achievement, 'id' | 'status'>) => void
  verifyAchievement: (achievementId: string, status: 'verified' | 'rejected', verifierId: string) => void
  
  // Certification actions
  submitCertification: (certification: Omit<Certification, 'id' | 'status'>) => void
  verifyCertification: (certificationId: string, status: 'verified' | 'rejected', verifierId: string) => void
  
  // Opportunity actions
  applyToOpportunity: (opportunityId: string) => void
  
  // Consultation actions
  requestConsultation: (consultation: Omit<Consultation, 'id' | 'status'>) => void
  updateConsultation: (consultationId: string, updates: Partial<Consultation>) => void
  
  // Message actions
  sendMessage: (receiverId: string, content: string) => void
  markMessageRead: (messageId: string) => void
  markMessageAsRead: (messageId: string) => void
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (notificationId: string) => void
  markNotificationAsRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  
  // Sport registration actions
  registerForSport: (registration: Omit<SportRegistration, 'id' | 'status'>) => void
  approveSportRegistration: (registrationId: string, approverId: string) => void
  rejectSportRegistration: (registrationId: string, approverId: string) => void
  
  // Physiotherapy actions
  bookPhysiotherapySlot: (appointment: Omit<PhysiotherapyAppointment, 'id' | 'status'>) => void
  approvePhysiotherapyAppointment: (appointmentId: string, approverId: string) => void
  cancelPhysiotherapyAppointment: (appointmentId: string) => void
  
  // Training plan pause actions
  requestTrainingPlanPause: (request: Omit<TrainingPlanPauseRequest, 'id' | 'status'>) => void
  approveTrainingPlanPause: (requestId: string, approverId: string) => void
  rejectTrainingPlanPause: (requestId: string, approverId: string) => void
  
  // Medical referral actions
  createMedicalReferral: (referral: Omit<MedicalReferral, 'id' | 'createdDate'>) => void
  resolveMedicalReferral: (referralId: string) => void
  
  // Community actions
  createCommunity: (community: Omit<Community, 'id'>) => void
  joinCommunity: (communityId: string, userId: string) => void
  leaveCommunity: (communityId: string, userId: string) => void
  sendCommunityMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  
  // Getters
  getUnreadMessagesCount: () => number
  getUnreadNotificationsCount: () => number
  getUserById: (userId: string) => User | undefined
  getAthleteTrainingPlans: (athleteId: string) => TrainingPlan[]
  getCoachTrainingPlans: (coachId: string) => TrainingPlan[]
  getAthleteAchievements: (athleteId: string) => Achievement[]
  getPendingVerifications: () => Achievement[]
  getSpecialistConsultations: (specialistId: string) => Consultation[]
  getAthleteConsultations: (athleteId: string) => Consultation[]
  getConversation: (userId1: string, userId2: string) => Message[]
  getAthleteSportRegistrations: (athleteId: string) => SportRegistration[]
  getCoachSportRegistrations: (coachId: string) => SportRegistration[]
  getAvailablePhysiotherapySlots: () => PhysiotherapySlot[]
  getAthletePhysiotherapyAppointments: (athleteId: string) => PhysiotherapyAppointment[]
  getPendingPauseRequests: (coachId: string) => TrainingPlanPauseRequest[]
  getAthleteMedicalReferrals: (athleteId: string) => MedicalReferral[]
  getCoachCertifications: (coachId: string) => Certification[]
  getPendingCertifications: () => Certification[]
  getUserCommunities: (userId: string) => Community[]
  getCommunityMessages: (communityId: string) => Message[]
  getVisibleCommunities: (userId: string) => Community[]
  
  // Registration verification methods
  getPendingRegistrations: () => User[]
  approveRegistration: (userId: string, officialId: string, comments: string) => void
  rejectRegistration: (userId: string, officialId: string, reason: string) => void
  
  // Rating calculation methods
  calculateAchievementBasedRating: (athleteId: string) => number
  calculatePerformanceBasedRating: (athleteId: string) => number
  calculateHybridAthleteRating: (athleteId: string) => number
}

// Mock data
const mockUsers: User[] = [
  {
    id: 'athlete-1',
    email: 'athlete@test.com',
    phone: '+1234567890',
    name: 'Marcus Johnson',
    role: 'athlete',
    avatar: '/avatars/athlete.jpg',
    bio: 'Professional track and field athlete specializing in 100m and 200m sprints.',
    sport: 'Track & Field',
    rating: 4.7
  },
  {
    id: 'athlete-2',
    email: 'sarah@test.com',
    phone: '+1234567891',
    name: 'Sarah Williams',
    role: 'athlete',
    avatar: '/avatars/athlete2.jpg',
    bio: 'Olympic hopeful swimmer.',
    sport: 'Swimming',
    rating: 4.9
  },
  {
    id: 'athlete-3',
    email: 'james@test.com',
    phone: '+1234567892',
    name: 'James Chen',
    role: 'athlete',
    avatar: '/avatars/athlete3.jpg',
    bio: 'Basketball point guard.',
    sport: 'Basketball',
    rating: 4.5
  },
  {
    id: 'coach-1',
    email: 'coach@test.com',
    phone: '+1234567893',
    name: 'David Thompson',
    role: 'coach',
    avatar: '/avatars/coach.jpg',
    bio: 'Experienced track coach with 15+ years of expertise.',
    sport: 'Track & Field',
    certifications: ['USATF Level 3', 'NSCA-CPT', 'First Aid'],
    rating: 4.8,
    profileVerified: true
  },
  {
    id: 'coach-2',
    email: 'coach2@test.com',
    phone: '+1234567894',
    name: 'Aisha Patel',
    role: 'coach',
    avatar: '/avatars/coach2.jpg',
    bio: 'Former collegiate swimmer and certified strength coach focused on endurance development.',
    sport: 'Swimming',
    certifications: ['ASCA Level 2', 'CSCS'],
    rating: 4.6,
    profilePendingVerification: true
  },
  {
    id: 'official-1',
    email: 'official@test.com',
    phone: '+1234567895',
    name: 'Linda Martinez',
    role: 'official',
    avatar: '/avatars/official.jpg',
    bio: 'National-level sports official and verifier.',
    certifications: ['National Referee License', 'Anti-Doping Certified'],
    isAdmin: true
  },
  {
    id: 'official-2',
    email: 'official2@test.com',
    phone: '+1234567896',
    name: 'Brian Osei',
    role: 'official',
    avatar: '/avatars/official2.jpg',
    bio: 'Regional verification specialist for multi-sport competitions.',
    certifications: ['Regional Referee License', 'Safeguarding Certified'],
    isAdmin: true
  },
  {
    id: 'specialist-1',
    email: 'specialist@test.com',
    phone: '+1234567897',
    name: 'Dr. Robert Kim',
    role: 'specialist',
    avatar: '/avatars/specialist.jpg',
    bio: 'Sports medicine physician specializing in athlete performance.',
    specialization: 'Sports Medicine',
    certifications: ['MD Sports Medicine', 'ACSM-CEP'],
    profileVerified: true
  },
  {
    id: 'specialist-2',
    email: 'specialist2@test.com',
    phone: '+1234567898',
    name: 'Dr. Emily Chen',
    role: 'specialist',
    avatar: '/avatars/specialist2.jpg',
    bio: 'Clinical psychologist specializing in sports psychology and mental performance.',
    specialization: 'Sports Psychology',
    certifications: ['PhD Clinical Psychology', 'CC-AASP'],
    profilePendingVerification: true
  }
]

const mockTrainingPlans: TrainingPlan[] = [
  {
    id: 'plan-1',
    name: 'Sprint Excellence Program',
    description: 'A comprehensive 12-week program designed to improve sprint times and explosive power.',
    athleteIds: ['athlete-1'],
    coachId: 'coach-1',
    status: 'active',
    mode: 'both',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    progress: 45,
    sessions: [
      { id: 'session-1', name: 'Speed Drills', date: '2026-01-20', completed: true, duration: 60 },
      { id: 'session-2', name: 'Strength Training', date: '2026-01-22', completed: true, duration: 75 },
      { id: 'session-3', name: 'Recovery & Flexibility', date: '2026-01-24', completed: false, duration: 45 },
      { id: 'session-4', name: 'Interval Training', date: '2026-01-27', completed: false, duration: 60 }
    ]
  },
  {
    id: 'plan-2',
    name: 'Endurance Foundation',
    description: 'Build your aerobic base with this progressive endurance program.',
    athleteIds: ['athlete-2'],
    coachId: 'coach-1',
    status: 'active',
    mode: 'physical',
    startDate: '2026-01-15',
    endDate: '2026-04-15',
    progress: 25,
    sessions: [
      { id: 'session-5', name: 'Long Swim', date: '2026-01-21', completed: true, duration: 90 },
      { id: 'session-6', name: 'Technique Work', date: '2026-01-23', completed: false, duration: 60 }
    ]
  },
  {
    id: 'plan-3',
    name: 'Basketball Speed & Agility',
    description: 'Agility, footwork, and conditioning plan for guards.',
    athleteIds: ['athlete-3'],
    coachId: 'coach-2',
    status: 'active',
    mode: 'online',
    startDate: '2026-01-10',
    endDate: '2026-04-10',
    progress: 35,
    sessions: [
      { id: 'session-7', name: 'Ladder Drills', date: '2026-01-19', completed: true, duration: 45 },
      { id: 'session-8', name: 'Plyometric Circuit', date: '2026-01-22', completed: false, duration: 60 }
    ]
  },
  {
    id: 'plan-4',
    name: 'Swim Power Phase',
    description: 'Power-focused microcycle for sprint swimmers.',
    athleteIds: ['athlete-2'],
    coachId: 'coach-2',
    status: 'paused',
    mode: 'both',
    startDate: '2025-12-20',
    endDate: '2026-02-20',
    progress: 60,
    sessions: [
      { id: 'session-9', name: 'Resistance Bands', date: '2026-01-18', completed: true, duration: 50 },
      { id: 'session-10', name: 'Sprint Sets', date: '2026-01-25', completed: true, duration: 70 }
    ]
  }
]

const mockAchievements: Achievement[] = [
  {
    id: 'achievement-1',
    athleteId: 'athlete-1',
    title: 'State Championship - 100m Gold',
    description: 'Won first place in the 100m dash at the State Championships with a time of 10.45s.',
    date: '2025-12-15',
    category: 'Competition',
    status: 'verified',
    verifiedBy: 'official-1',
    verifiedDate: '2025-12-18'
  },
  {
    id: 'achievement-2',
    athleteId: 'athlete-1',
    title: 'Personal Best - 200m',
    description: 'Set a new personal best of 20.8s in the 200m sprint.',
    date: '2026-01-10',
    category: 'Performance',
    status: 'pending'
  },
  {
    id: 'achievement-3',
    athleteId: 'athlete-2',
    title: 'Regional Swimming Meet - Silver',
    description: 'Second place in 200m freestyle at Regional Championships.',
    date: '2026-01-05',
    category: 'Competition',
    status: 'pending'
  },
  {
    id: 'achievement-4',
    athleteId: 'athlete-3',
    title: 'City League MVP',
    description: 'Named MVP of the City League season after averaging 18 points per game.',
    date: '2025-11-30',
    category: 'Season Award',
    status: 'verified',
    verifiedBy: 'official-2',
    verifiedDate: '2025-12-05'
  }
]

const mockCertifications: Certification[] = [
  {
    id: 'cert-1',
    coachId: 'coach-1',
    title: 'USATF Level 3 Coach Certification',
    issuingOrganization: 'USA Track & Field',
    issueDate: '2024-06-15',
    expiryDate: '2027-06-15',
    credentialId: 'USATF-L3-2024-001',
    status: 'verified',
    verifiedBy: 'official-1',
    verifiedDate: '2024-07-01'
  },
  {
    id: 'cert-2',
    coachId: 'coach-1',
    title: 'NSCA Certified Personal Trainer',
    issuingOrganization: 'National Strength and Conditioning Association',
    issueDate: '2023-09-20',
    expiryDate: '2026-09-20',
    credentialId: 'NSCA-CPT-2023-0456',
    status: 'verified',
    verifiedBy: 'official-1',
    verifiedDate: '2023-10-01'
  },
  {
    id: 'cert-3',
    coachId: 'coach-2',
    title: 'First Aid and CPR Certification',
    issuingOrganization: 'American Red Cross',
    issueDate: '2025-11-10',
    expiryDate: '2027-11-10',
    credentialId: 'ARC-FA-CPR-2025-0789',
    status: 'pending'
  },
  {
    id: 'cert-4',
    coachId: 'coach-2',
    title: 'Strength & Conditioning Specialist',
    issuingOrganization: 'NSCA',
    issueDate: '2024-03-12',
    expiryDate: '2027-03-12',
    credentialId: 'NSCA-CSCS-2024-1120',
    status: 'verified',
    verifiedBy: 'official-2',
    verifiedDate: '2024-03-30'
  }
]

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Elite Track Scholarship',
    organization: 'State University Athletics',
    type: 'scholarship',
    deadline: '2026-03-01',
    description: 'Full athletic scholarship for talented track and field athletes.',
    requirements: ['Minimum 3.0 GPA', 'State-level competition experience', 'Coach recommendation'],
    status: 'open'
  },
  {
    id: 'opp-2',
    title: 'National Junior Championships',
    organization: 'National Athletics Federation',
    type: 'competition',
    deadline: '2026-02-15',
    description: 'Compete against the best junior athletes in the country.',
    requirements: ['Age 18-21', 'Qualifying time required', 'Federation membership'],
    status: 'open'
  },
  {
    id: 'opp-3',
    title: 'Sports Brand Ambassador',
    organization: 'Athletic Gear Co.',
    type: 'sponsorship',
    deadline: '2026-04-01',
    description: 'Become a brand ambassador and receive gear sponsorship.',
    requirements: ['Active social media presence', 'Verified achievements', 'Professional conduct'],
    status: 'open'
  }
]

const mockConsultations: Consultation[] = [
  {
    id: 'consult-1',
    athleteId: 'athlete-1',
    specialistId: 'specialist-1',
    date: '2026-01-28',
    time: '10:00 AM',
    status: 'scheduled',
    type: 'Performance Assessment',
    priority: 'medium'
  },
  {
    id: 'consult-2',
    athleteId: 'athlete-2',
    specialistId: 'specialist-1',
    date: '2026-01-29',
    time: '2:00 PM',
    status: 'scheduled',
    type: 'Injury Prevention',
    priority: 'high'
  },
  {
    id: 'consult-3',
    athleteId: 'athlete-3',
    specialistId: 'specialist-2',
    date: '2026-01-30',
    time: '4:00 PM',
    status: 'scheduled',
    type: 'Mental Performance',
    priority: 'medium'
  }
]

const mockSportRegistrations: SportRegistration[] = [
  {
    id: 'sport-reg-1',
    athleteId: 'athlete-1',
    sport: 'Track & Field',
    coachId: 'coach-1',
    priority: 1,
    status: 'approved',
    approvedBy: 'official-1',
    approvedDate: '2026-01-15'
  },
  {
    id: 'sport-reg-2',
    athleteId: 'athlete-1',
    sport: 'Swimming',
    coachId: 'coach-1',
    priority: 2,
    status: 'pending'
  },
  {
    id: 'sport-reg-3',
    athleteId: 'athlete-2',
    sport: 'Swimming',
    coachId: 'coach-2',
    priority: 1,
    status: 'approved',
    approvedBy: 'official-2',
    approvedDate: '2026-01-18'
  },
  {
    id: 'sport-reg-4',
    athleteId: 'athlete-3',
    sport: 'Basketball',
    coachId: 'coach-2',
    priority: 1,
    status: 'rejected',
    approvedBy: 'official-2',
    approvedDate: '2026-01-20',
    notes: 'Incomplete documentation'
  }
]

const mockPhysiotherapySlots: PhysiotherapySlot[] = [
  {
    id: 'slot-1',
    specialistId: 'specialist-1',
    date: '2026-02-05',
    time: '10:00',
    duration: 60,
    available: true
  },
  {
    id: 'slot-2',
    specialistId: 'specialist-1',
    date: '2026-02-05',
    time: '14:00',
    duration: 60,
    available: true
  },
  {
    id: 'slot-3',
    specialistId: 'specialist-1',
    date: '2026-02-06',
    time: '11:00',
    duration: 45,
    available: false,
    bookedBy: 'athlete-1'
  },
  {
    id: 'slot-4',
    specialistId: 'specialist-2',
    date: '2026-02-07',
    time: '09:00',
    duration: 50,
    available: true
  },
  {
    id: 'slot-5',
    specialistId: 'specialist-2',
    date: '2026-02-07',
    time: '15:00',
    duration: 50,
    available: false,
    bookedBy: 'athlete-3'
  }
]

const mockPhysiotherapyAppointments: PhysiotherapyAppointment[] = [
  {
    id: 'appt-1',
    athleteId: 'athlete-1',
    slotId: 'slot-3',
    specialistId: 'specialist-1',
    status: 'approved',
    reason: 'Shoulder rehabilitation',
    notes: 'Post-injury recovery program',
    approvedBy: 'coach-1',
    approvedDate: '2026-01-28'
  },
  {
    id: 'appt-2',
    athleteId: 'athlete-3',
    slotId: 'slot-5',
    specialistId: 'specialist-2',
    status: 'requested',
    reason: 'Performance anxiety',
    notes: 'Pre-game stress management'
  }
]

const mockTrainingPlanPauseRequests: TrainingPlanPauseRequest[] = [
  {
    id: 'pause-1',
    planId: 'plan-1',
    athleteId: 'athlete-1',
    coachId: 'coach-1',
    reason: 'medical',
    description: 'Sprained ankle during practice',
    status: 'pending',
    medicalReferral: true,
    specialistId: 'specialist-1'
  },
  {
    id: 'pause-2',
    planId: 'plan-4',
    athleteId: 'athlete-2',
    coachId: 'coach-2',
    reason: 'event',
    description: 'School examinations week',
    status: 'approved',
    approvedBy: 'coach-2',
    approvedDate: '2026-01-12'
  }
]

const mockMedicalReferrals: MedicalReferral[] = [
  {
    id: 'referral-1',
    athleteId: 'athlete-1',
    coachId: 'coach-1',
    specialistId: 'specialist-1',
    issue: 'Ankle sprain requiring physiotherapy',
    urgency: 'medium',
    status: 'active',
    notes: 'Athlete reported pain during sprint training',
    createdDate: '2026-01-28'
  },
  {
    id: 'referral-2',
    athleteId: 'athlete-2',
    coachId: 'coach-2',
    specialistId: 'specialist-2',
    issue: 'Stress management and sleep issues',
    urgency: 'low',
    status: 'active',
    notes: 'Recommend weekly sessions for 4 weeks',
    createdDate: '2026-01-22'
  }
]

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'coach-1',
    receiverId: 'athlete-1',
    content: 'Great progress on your sprint times! Keep up the excellent work.',
    timestamp: '2026-01-26T10:30:00',
    read: true
  },
  {
    id: 'msg-2',
    senderId: 'athlete-1',
    receiverId: 'coach-1',
    content: 'Thank you coach! The new training program is really helping.',
    timestamp: '2026-01-26T11:15:00',
    read: true
  },
  {
    id: 'msg-3',
    senderId: 'specialist-1',
    receiverId: 'athlete-1',
    content: 'Reminder: Your performance assessment is scheduled for tomorrow at 10 AM.',
    timestamp: '2026-01-27T09:00:00',
    read: false
  },
  {
    id: 'msg-4',
    senderId: 'coach-2',
    receiverId: 'athlete-2',
    content: 'Please review the updated swim power phase plan in your dashboard.',
    timestamp: '2026-01-26T16:20:00',
    read: false
  },
  {
    id: 'msg-5',
    senderId: 'specialist-2',
    receiverId: 'athlete-3',
    content: 'Your mental performance session is confirmed for Friday at 4 PM.',
    timestamp: '2026-01-27T13:10:00',
    read: false
  }
]

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'athlete-1',
    title: 'Achievement Verified',
    message: 'Your "State Championship - 100m Gold" achievement has been verified!',
    type: 'success',
    read: false,
    timestamp: '2026-01-27T08:00:00',
    link: '/athlete/achievements'
  },
  {
    id: 'notif-2',
    userId: 'athlete-1',
    title: 'New Training Session',
    message: 'Coach David has scheduled a new training session for tomorrow.',
    type: 'info',
    read: false,
    timestamp: '2026-01-26T15:00:00',
    link: '/athlete/training'
  },
  {
    id: 'notif-3',
    userId: 'official-1',
    title: 'New Verification Request',
    message: 'Marcus Johnson submitted a new achievement for verification.',
    type: 'info',
    read: false,
    timestamp: '2026-01-27T07:30:00',
    link: '/official/verifications'
  },
  {
    id: 'notif-4',
    userId: 'coach-2',
    title: 'Certification Verified',
    message: 'Your Strength & Conditioning Specialist certification has been verified.',
    type: 'success',
    read: false,
    timestamp: '2026-01-20T09:15:00',
    link: '/coach'
  },
  {
    id: 'notif-5',
    userId: 'specialist-2',
    title: 'New Consultation Request',
    message: 'A new mental performance consultation has been scheduled.',
    type: 'info',
    read: false,
    timestamp: '2026-01-27T12:30:00',
    link: '/specialist/consultations'
  }
]

const mockCommunities: Community[] = [
  {
    id: 'community-1',
    name: 'Track & Field Sprint Team',
    description: 'Discussion group for track and field athletes focusing on sprint events.',
    sport: 'Track & Field',
    coachId: 'coach-1',
    memberIds: ['athlete-1', 'coach-1'],
    createdAt: '2026-01-15T10:00:00'
  },
  {
    id: 'community-2',
    name: 'Swimming Performance Group',
    description: 'Community for swimmers to share training tips and discuss competitions.',
    sport: 'Swimming',
    coachId: 'coach-2',
    memberIds: ['athlete-2', 'coach-2'],
    createdAt: '2026-01-16T11:00:00'
  },
  {
    id: 'community-3',
    name: 'Sports Medicine Updates',
    description: 'Latest developments in sports medicine and injury prevention.',
    sport: 'General',
    coachId: 'specialist-1',
    memberIds: ['specialist-1', 'specialist-2', 'coach-1', 'coach-2'],
    createdAt: '2026-01-17T12:00:00'
  }
]

const initialDemoUser = getDemoUserFromStorage()

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentUser: initialDemoUser,
  isAuthenticated: Boolean(initialDemoUser),
  users: mockUsers,
  trainingPlans: mockTrainingPlans,
  achievements: mockAchievements,
  certifications: mockCertifications,
  opportunities: mockOpportunities,
  consultations: mockConsultations,
  sportRegistrations: mockSportRegistrations,
  physiotherapySlots: mockPhysiotherapySlots,
  physiotherapyAppointments: mockPhysiotherapyAppointments,
  trainingPlanPauseRequests: mockTrainingPlanPauseRequests,
  medicalReferrals: mockMedicalReferrals,
  messages: mockMessages,
  notifications: mockNotifications,
  communities: mockCommunities,
  
  // Auth actions
  login: (email, password, role) => {
    const user = mockUsers.find(u => u.role === role)
    if (user) {
      set({ currentUser: { ...user, email }, isAuthenticated: true })
      return true
    }
    return false
  },
  
  logout: () => {
    set({ currentUser: null, isAuthenticated: false })
  },
  
  // User actions
  updateUser: (userId, updates) => {
    set(state => ({
      users: state.users.map(u => u.id === userId ? { ...u, ...updates } : u),
      currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser
    }))
  },
  
  // Training plan actions
  createTrainingPlan: (plan) => {
    const newPlan: TrainingPlan = {
      ...plan,
      id: `plan-${Date.now()}`
    }
    set(state => ({
      trainingPlans: [...state.trainingPlans, newPlan]
    }))
    
    // Notify all assigned athletes
    plan.athleteIds.forEach(athleteId => {
      const athlete = get().users.find(u => u.id === athleteId)
      if (athlete) {
        get().addNotification({
          userId: athleteId,
          title: 'New Training Plan',
          message: `You have been assigned a new training plan: ${plan.name}`,
          type: 'info',
          link: '/athlete/training'
        })
      }
    })
  },
  
  updateTrainingPlan: (planId, updates) => {
    set(state => ({
      trainingPlans: state.trainingPlans.map(p => p.id === planId ? { ...p, ...updates } : p)
    }))
  },
  
  completeSession: (planId, sessionId) => {
    set(state => ({
      trainingPlans: state.trainingPlans.map(p => {
        if (p.id === planId) {
          const updatedSessions = p.sessions.map(s => 
            s.id === sessionId ? { ...s, completed: true } : s
          )
          const completedCount = updatedSessions.filter(s => s.completed).length
          const progress = Math.round((completedCount / updatedSessions.length) * 100)
          return { ...p, sessions: updatedSessions, progress }
        }
        return p
      })
    }))
  },
  
  // Achievement actions
  submitAchievement: (achievement) => {
    const newAchievement: Achievement = {
      ...achievement,
      id: `achievement-${Date.now()}`,
      status: 'pending'
    }
    set(state => ({
      achievements: [...state.achievements, newAchievement]
    }))
    
    // Notify officials
    get().users.filter(u => u.role === 'official').forEach(official => {
      get().addNotification({
        userId: official.id,
        title: 'New Verification Request',
        message: `A new achievement "${achievement.title}" has been submitted for verification.`,
        type: 'info',
        link: '/official'
      })
    })
  },
  
  verifyAchievement: (achievementId, status, verifierId) => {
    set(state => ({
      achievements: state.achievements.map(a => 
        a.id === achievementId 
          ? { ...a, status, verifiedBy: verifierId, verifiedDate: new Date().toISOString().split('T')[0] }
          : a
      )
    }))
    
    // Notify athlete
    const achievement = get().achievements.find(a => a.id === achievementId)
    if (achievement) {
      get().addNotification({
        userId: achievement.athleteId,
        title: status === 'verified' ? 'Achievement Verified' : 'Achievement Rejected',
        message: `Your achievement "${achievement.title}" has been ${status}.`,
        type: status === 'verified' ? 'success' : 'error',
        link: '/athlete/achievements'
      })
    }
  },
  
  // Certification actions
  submitCertification: (certification) => {
    const newCertification: Certification = {
      ...certification,
      id: `certification-${Date.now()}`,
      status: 'pending'
    }
    set(state => ({
      certifications: [...state.certifications, newCertification]
    }))
    
    // Notify officials
    get().users.filter(u => u.role === 'official').forEach(official => {
      get().addNotification({
        userId: official.id,
        title: 'New Certification Review Request',
        message: `A new certification "${certification.title}" has been submitted for review.`,
        type: 'info',
        link: '/official'
      })
    })
  },
  
  verifyCertification: (certificationId, status, verifierId) => {
    set(state => ({
      certifications: state.certifications.map(c => 
        c.id === certificationId 
          ? { ...c, status, verifiedBy: verifierId, verifiedDate: new Date().toISOString().split('T')[0] }
          : c
      )
    }))
    
    // Update coach's certifications if verified
    if (status === 'verified') {
      const certification = get().certifications.find(c => c.id === certificationId)
      if (certification) {
        set(state => ({
          users: state.users.map(user => 
            user.id === certification.coachId 
              ? { 
                  ...user, 
                  certifications: [...(user.certifications || []), certification.title] 
                }
              : user
          )
        }))
      }
    }
    
    // Notify coach
    const certification = get().certifications.find(c => c.id === certificationId)
    if (certification) {
      get().addNotification({
        userId: certification.coachId,
        title: status === 'verified' ? 'Certification Approved' : 'Certification Rejected',
        message: `Your certification "${certification.title}" has been ${status}.`,
        type: status === 'verified' ? 'success' : 'error',
        link: '/coach/profile'
      })
    }
  },
  
  // Opportunity actions
  applyToOpportunity: (opportunityId) => {
    const opportunity = get().opportunities.find(o => o.id === opportunityId)
    if (opportunity && get().currentUser) {
      get().addNotification({
        userId: get().currentUser!.id,
        title: 'Application Submitted',
        message: `Your application for "${opportunity.title}" has been submitted.`,
        type: 'success'
      })
    }
  },
  
  // Consultation actions
  requestConsultation: (consultation) => {
    const newConsultation: Consultation = {
      ...consultation,
      id: `consult-${Date.now()}`,
      status: 'scheduled'
    }
    set(state => ({
      consultations: [...state.consultations, newConsultation]
    }))
    
    // Notify specialist
    get().addNotification({
      userId: consultation.specialistId,
      title: 'New Consultation Request',
      message: 'You have a new consultation request.',
      type: 'info',
      link: '/specialist'
    })
  },
  
  updateConsultation: (consultationId, updates) => {
    set(state => ({
      consultations: state.consultations.map(c => 
        c.id === consultationId ? { ...c, ...updates } : c
      )
    }))
  },
  
  // Message actions
  sendMessage: (receiverId, content) => {
    const currentUser = get().currentUser
    if (!currentUser) return
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    }
    set(state => ({
      messages: [...state.messages, newMessage]
    }))
    
    // Notify receiver
    get().addNotification({
      userId: receiverId,
      title: 'New Message',
      message: `${currentUser.name} sent you a message.`,
      type: 'info',
      link: '/messages'
    })
  },
  
  markMessageRead: (messageId) => {
    set(state => ({
      messages: state.messages.map(m => m.id === messageId ? { ...m, read: true } : m)
    }))
  },
  
  markMessageAsRead: (messageId) => {
    get().markMessageRead(messageId)
  },
  
  // Notification actions
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    }
    set(state => ({
      notifications: [...state.notifications, newNotification]
    }))
  },
  
  markNotificationRead: (notificationId) => {
    set(state => ({
      notifications: state.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
    }))
  },
  
  markNotificationAsRead: (notificationId) => {
    get().markNotificationRead(notificationId)
  },
  
  markAllNotificationsRead: () => {
    const currentUser = get().currentUser
    if (!currentUser) return
    
    set(state => ({
      notifications: state.notifications.map(n => 
        n.userId === currentUser.id ? { ...n, read: true } : n
      )
    }))
  },
  
  // Getters
  getUnreadMessagesCount: () => {
    const currentUser = get().currentUser
    if (!currentUser) return 0
    return get().messages.filter(m => m.receiverId === currentUser.id && !m.read).length
  },
  
  getUnreadNotificationsCount: () => {
    const currentUser = get().currentUser
    if (!currentUser) return 0
    return get().notifications.filter(n => n.userId === currentUser.id && !n.read).length
  },
  
  getUserById: (userId) => {
    return get().users.find(u => u.id === userId)
  },
  
  getAthleteTrainingPlans: (athleteId) => {
    return get().trainingPlans.filter(p => p.athleteIds.includes(athleteId))
  },
  
  getCoachTrainingPlans: (coachId) => {
    return get().trainingPlans.filter(p => p.coachId === coachId)
  },
  
  getAthleteAchievements: (athleteId) => {
    return get().achievements.filter(a => a.athleteId === athleteId)
  },
  
  getPendingVerifications: () => {
    return get().achievements.filter(a => a.status === 'pending')
  },
  
  getCoachCertifications: (coachId) => {
    return get().certifications.filter(c => c.coachId === coachId)
  },
  
  getPendingCertifications: () => {
    return get().certifications.filter(c => c.status === 'pending')
  },
  
  getSpecialistConsultations: (specialistId) => {
    return get().consultations.filter(c => c.specialistId === specialistId)
  },
  
  getAthleteConsultations: (athleteId) => {
    return get().consultations.filter(c => c.athleteId === athleteId)
  },

  // Rating Calculation Methods
  // Option 1: Achievement-Based Rating
  // Formula: (Sum of achievement scores) / (Number of verified achievements)
  // Scoring: Competition (5pts), Season Award (5pts), Performance (4pts), other (3pts)
  calculateAchievementBasedRating: (athleteId: string) => {
    const athleteAchievements = get().getAthleteAchievements(athleteId)
    const verifiedAchievements = athleteAchievements.filter(a => a.status === 'verified')
    
    if (verifiedAchievements.length === 0) return 3.0 // Default rating if no verified achievements
    
    const scoreMap = {
      'Competition': 5,
      'Season Award': 5,
      'Performance': 4,
      'Training': 3
    }
    
    const totalScore = verifiedAchievements.reduce((sum, achievement) => {
      const categoryScore = scoreMap[achievement.category as keyof typeof scoreMap] || 3
      return sum + categoryScore
    }, 0)
    
    const rating = Math.min(5, (totalScore / verifiedAchievements.length) * 0.9 + 0.5)
    return Math.round(rating * 10) / 10 // Round to 1 decimal place
  },

  // Option 2: Performance-Based Rating
  // Formula: (Completed sessions / Total sessions) * 5
  // Measures training completion rate
  calculatePerformanceBasedRating: (athleteId: string) => {
    const athletePlans = get().getAthleteTrainingPlans(athleteId)
    
    if (athletePlans.length === 0) return 3.0 // Default rating if no training plans
    
    let totalSessions = 0
    let completedSessions = 0
    
    athletePlans.forEach(plan => {
      plan.sessions.forEach(session => {
        totalSessions++
        if (session.completed) completedSessions++
      })
    })
    
    if (totalSessions === 0) return 3.0
    
    const completionRate = completedSessions / totalSessions
    const rating = completionRate * 5
    return Math.round(rating * 10) / 10 // Round to 1 decimal place
  },

  // Hybrid Rating: Average of both methods
  calculateHybridAthleteRating: (athleteId: string) => {
    const achievementRating = get().calculateAchievementBasedRating(athleteId)
    const performanceRating = get().calculatePerformanceBasedRating(athleteId)
    const hybridRating = (achievementRating + performanceRating) / 2
    return Math.round(hybridRating * 10) / 10
  },
  
  // Sport registration actions
  registerForSport: (registration) => {
    const newRegistration: SportRegistration = {
      ...registration,
      id: `sport-reg-${Date.now()}`,
      status: 'pending'
    }
    
    set(state => ({
      sportRegistrations: [...state.sportRegistrations, newRegistration]
    }))
    
    // Notify coach and officials
    get().addNotification({
      userId: registration.coachId,
      title: 'New Sport Registration Request',
      message: 'An athlete has requested to register for a new sport.',
      type: 'info',
      link: '/coach'
    })
    
    get().users.filter(u => u.role === 'official').forEach(official => {
      get().addNotification({
        userId: official.id,
        title: 'Sport Registration Review',
        message: 'A new sport registration requires approval.',
        type: 'info',
        link: '/official'
      })
    })
  },
  
  approveSportRegistration: (registrationId, approverId) => {
    set(state => ({
      sportRegistrations: state.sportRegistrations.map(reg => 
        reg.id === registrationId 
          ? { ...reg, status: 'approved', approvedBy: approverId, approvedDate: new Date().toISOString() }
          : reg
      )
    }))
    
    const registration = get().sportRegistrations.find(r => r.id === registrationId)
    if (registration) {
      get().addNotification({
        userId: registration.athleteId,
        title: 'Sport Registration Approved',
        message: `Your registration for ${registration.sport} has been approved.`,
        type: 'success'
      })
    }
  },
  
  rejectSportRegistration: (registrationId, approverId) => {
    set(state => ({
      sportRegistrations: state.sportRegistrations.map(reg => 
        reg.id === registrationId 
          ? { ...reg, status: 'rejected', approvedBy: approverId, approvedDate: new Date().toISOString() }
          : reg
      )
    }))
    
    const registration = get().sportRegistrations.find(r => r.id === registrationId)
    if (registration) {
      get().addNotification({
        userId: registration.athleteId,
        title: 'Sport Registration Rejected',
        message: `Your registration for ${registration.sport} has been rejected.`,
        type: 'warning'
      })
    }
  },
  
  // Physiotherapy actions
  bookPhysiotherapySlot: (appointment) => {
    const newAppointment: PhysiotherapyAppointment = {
      ...appointment,
      id: `appt-${Date.now()}`,
      status: 'requested'
    }
    
    set(state => ({
      physiotherapyAppointments: [...state.physiotherapyAppointments, newAppointment],
      physiotherapySlots: state.physiotherapySlots.map(slot => 
        slot.id === appointment.slotId ? { ...slot, available: false, bookedBy: appointment.athleteId } : slot
      )
    }))
    
    // Notify coach for approval
    get().addNotification({
      userId: appointment.specialistId,
      title: 'New Physiotherapy Request',
      message: 'An athlete has requested a physiotherapy appointment.',
      type: 'info',
      link: '/specialist'
    })
  },
  
  approvePhysiotherapyAppointment: (appointmentId, approverId) => {
    set(state => ({
      physiotherapyAppointments: state.physiotherapyAppointments.map(appt => 
        appt.id === appointmentId 
          ? { ...appt, status: 'approved', approvedBy: approverId, approvedDate: new Date().toISOString() }
          : appt
      )
    }))
    
    const appointment = get().physiotherapyAppointments.find(a => a.id === appointmentId)
    if (appointment) {
      get().addNotification({
        userId: appointment.athleteId,
        title: 'Physiotherapy Approved',
        message: 'Your physiotherapy appointment has been approved.',
        type: 'success'
      })
    }
  },
  
  cancelPhysiotherapyAppointment: (appointmentId) => {
    const appointment = get().physiotherapyAppointments.find(a => a.id === appointmentId)
    
    set(state => ({
      physiotherapyAppointments: state.physiotherapyAppointments.filter(a => a.id !== appointmentId),
      physiotherapySlots: state.physiotherapySlots.map(slot => 
        slot.id === appointment?.slotId ? { ...slot, available: true, bookedBy: undefined } : slot
      )
    }))
  },
  
  // Training plan pause actions
  requestTrainingPlanPause: (request) => {
    const newRequest: TrainingPlanPauseRequest = {
      ...request,
      id: `pause-${Date.now()}`,
      status: 'pending'
    }
    
    set(state => ({
      trainingPlanPauseRequests: [...state.trainingPlanPauseRequests, newRequest]
    }))
    
    // Notify coach
    get().addNotification({
      userId: request.coachId,
      title: 'Training Plan Pause Request',
      message: 'An athlete has requested to pause their training plan.',
      type: 'warning',
      link: '/coach'
    })
    
    // Create medical referral if needed
    if (request.medicalReferral && request.specialistId) {
      get().createMedicalReferral({
        athleteId: request.athleteId,
        coachId: request.coachId,
        specialistId: request.specialistId,
        issue: request.description,
        urgency: 'medium',
        status: 'active',
        notes: `Pause request: ${request.description}`
      })
    }
  },
  
  approveTrainingPlanPause: (requestId, approverId) => {
    const request = get().trainingPlanPauseRequests.find(r => r.id === requestId)
    
    set(state => ({
      trainingPlanPauseRequests: state.trainingPlanPauseRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', approvedBy: approverId, approvedDate: new Date().toISOString() }
          : req
      ),
      trainingPlans: state.trainingPlans.map(plan => 
        plan.id === request?.planId ? { ...plan, status: 'paused' } : plan
      )
    }))
    
    if (request) {
      get().addNotification({
        userId: request.athleteId,
        title: 'Training Plan Paused',
        message: 'Your training plan has been paused as requested.',
        type: 'info'
      })
    }
  },
  
  rejectTrainingPlanPause: (requestId, approverId) => {
    set(state => ({
      trainingPlanPauseRequests: state.trainingPlanPauseRequests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected', approvedBy: approverId, approvedDate: new Date().toISOString() }
          : req
      )
    }))
    
    const request = get().trainingPlanPauseRequests.find(r => r.id === requestId)
    if (request) {
      get().addNotification({
        userId: request.athleteId,
        title: 'Pause Request Rejected',
        message: 'Your training plan pause request has been rejected.',
        type: 'warning'
      })
    }
  },
  
  // Medical referral actions
  createMedicalReferral: (referral) => {
    const newReferral: MedicalReferral = {
      ...referral,
      id: `referral-${Date.now()}`,
      createdDate: new Date().toISOString()
    }
    
    set(state => ({
      medicalReferrals: [...state.medicalReferrals, newReferral]
    }))
    
    // Notify specialist
    get().addNotification({
      userId: referral.specialistId,
      title: 'New Medical Referral',
      message: 'You have received a medical referral from a coach.',
      type: 'warning',
      link: '/specialist'
    })
  },
  
  resolveMedicalReferral: (referralId) => {
    set(state => ({
      medicalReferrals: state.medicalReferrals.map(ref => 
        ref.id === referralId ? { ...ref, status: 'resolved' } : ref
      )
    }))
  },
  
  // Community actions
  createCommunity: (community) => {
    const newCommunity: Community = {
      ...community,
      id: `community-${Date.now()}`
    }
    set(state => ({
      communities: [...state.communities, newCommunity]
    }))
  },
  
  joinCommunity: (communityId, userId) => {
    set(state => ({
      communities: state.communities.map(community =>
        community.id === communityId && !community.memberIds.includes(userId)
          ? { ...community, memberIds: [...community.memberIds, userId] }
          : community
      )
    }))
  },
  
  leaveCommunity: (communityId, userId) => {
    set(state => ({
      communities: state.communities.map(community =>
        community.id === communityId
          ? { ...community, memberIds: community.memberIds.filter(id => id !== userId) }
          : community
      )
    }))
  },
  
  sendCommunityMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    }
    set(state => ({
      messages: [...state.messages, newMessage]
    }))
  },

  getConversation: (userId1, userId2) => {
    return get().messages.filter(m => 
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },
  
  getAthleteSportRegistrations: (athleteId) => {
    return get().sportRegistrations.filter(reg => reg.athleteId === athleteId)
  },
  
  getCoachSportRegistrations: (coachId) => {
    return get().sportRegistrations.filter(reg => reg.coachId === coachId)
  },
  
  getAvailablePhysiotherapySlots: () => {
    return get().physiotherapySlots.filter(slot => slot.available)
  },
  
  getAthletePhysiotherapyAppointments: (athleteId) => {
    return get().physiotherapyAppointments.filter(appt => appt.athleteId === athleteId)
  },
  
  getPendingPauseRequests: (coachId) => {
    return get().trainingPlanPauseRequests.filter(req => req.coachId === coachId && req.status === 'pending')
  },
  
  getAthleteMedicalReferrals: (athleteId) => {
    return get().medicalReferrals.filter(ref => ref.athleteId === athleteId)
  },
  
  getUserCommunities: (userId) => {
    return get().communities.filter(community => community.memberIds.includes(userId))
  },
  
  getCommunityMessages: (communityId) => {
    return get().messages.filter(message => message.communityId === communityId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  },
  
  getVisibleCommunities: (userId) => {
    const user = get().users.find(u => u.id === userId)
    if (!user) return []
    
    if (user.role === 'specialist' || user.role === 'official') {
      // Specialists and officials can see all communities
      return get().communities
    } else {
      // Athletes and coaches can only see communities they're members of
      return get().communities.filter(community => community.memberIds.includes(userId))
    }
  },
  
  // Registration Verification Methods
  getPendingRegistrations: () => {
    return get().users.filter(u => u.role !== 'official' && !u.registrationVerified && !u.registrationRejected)
  },
  
  approveRegistration: (userId: string, officialId: string, comments: string) => {
    set(state => ({
      users: state.users.map(u => 
        u.id === userId 
          ? {
              ...u,
              registrationVerified: true,
              registrationRejected: false,
              verifiedBy: officialId,
              verifiedAt: new Date().toISOString(),
              profileVerified: true,
              profilePendingVerification: false
            }
          : u
      )
    }))
    
    // Add notification
    get().addNotification({
      id: `notif-${Date.now()}`,
      userId: userId,
      type: 'registration_approved',
      title: 'Registration Approved',
      message: `Your registration has been approved by an official.${comments ? ' ' + comments : ''}`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/profile'
    })
  },
  
  rejectRegistration: (userId: string, officialId: string, reason: string) => {
    set(state => ({
      users: state.users.map(u =>
        u.id === userId
          ? {
              ...u,
              registrationVerified: false,
              registrationRejected: true,
              rejectionReason: reason,
              verifiedBy: officialId,
              verifiedAt: new Date().toISOString(),
              profilePendingVerification: true
            }
          : u
      )
    }))
    
    // Add notification
    get().addNotification({
      id: `notif-${Date.now()}`,
      userId: userId,
      type: 'registration_rejected',
      title: 'Registration Rejected',
      message: `Your registration has been rejected. Reason: ${reason}`,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: '/profile'
    })
  }
}))
