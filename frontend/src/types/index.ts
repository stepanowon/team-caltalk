// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// User Types
export interface User {
  id: number
  username: string
  email: string
  full_name: string
  created_at: string
  updated_at: string
}

// Team Types
export interface Team {
  id: number
  name: string
  description?: string
  invite_code: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: number
  team_id: number
  user_id: number
  role: 'leader' | 'member'
  joined_at: string
}

// Schedule Types
export interface Schedule {
  id: number
  team_id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface ScheduleParticipant {
  id: number
  schedule_id: number
  user_id: number
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

// Message Types
export interface Message {
  id: number
  team_id: number
  user_id: number
  content: string
  message_date: string
  created_at: string
  updated_at: string
}

// Auth Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  full_name: string
}

export interface AuthResponse {
  user: User
  token: string
}
