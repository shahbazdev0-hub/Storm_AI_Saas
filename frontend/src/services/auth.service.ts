// // frontend/src/services/auth.service.ts - Updated with Role Support

// import { api } from './api'

// export type UserRole = 'admin' | 'customer' | 'technician' | 'manager'

// export interface User {
//   id: string
//   company_id: string
//   email: string
//   first_name: string
//   last_name: string
//   role: UserRole
//   status: string
//   permissions: string[]
//   is_email_verified: boolean
//   is_phone_verified: boolean
//   created_at: string
//   updated_at: string
//   full_name: string
//   display_name: string
//   is_active: boolean
//   is_admin: boolean
// }

// export interface LoginRequest {
//   email: string
//   password: string
//   remember_me?: boolean
// }

// export interface RegisterRequest {
//   email: string
//   password: string
//   first_name: string
//   last_name: string
//   role: UserRole
//   company_name?: string // Optional, only needed for admin users
// }

// export interface AuthResponse {
//   user: User
//   access_token: string
//   refresh_token: string
//   token_type: string
//   expires_in: number
// }

// class AuthService {
//   async login(credentials: LoginRequest): Promise<AuthResponse> {
//     console.log('🔐 AuthService.login() called with:', { email: credentials.email })
    
//     const params = new URLSearchParams()
//     params.append('username', credentials.email)
//     params.append('password', credentials.password)
//     params.append('grant_type', 'password')
//     if (credentials.remember_me) params.append('remember_me', 'true')

//     console.log('📡 Making login request to: /auth/login')
    
//     try {
//       const { data } = await api.post('/auth/login', params, {
//         headers: { 
//           'Content-Type': 'application/x-www-form-urlencoded'
//         },
//       })
      
//       console.log('✅ Login successful, user role:', data.user.role)
      
//       return {
//         user: data.user,
//         access_token: data.access_token,
//         refresh_token: data.refresh_token || '',
//         token_type: data.token_type || 'bearer',
//         expires_in: data.expires_in || 3600
//       }
//     } catch (error: any) {
//       console.error('❌ Login failed:', error.response?.data || error.message)
//       throw error
//     }
//   }

//   async register(userData: RegisterRequest): Promise<AuthResponse> {
//     console.log('📝 AuthService.register() called with:', { 
//       email: userData.email, 
//       role: userData.role,
//       company_name: userData.company_name 
//     })
    
//     console.log('📡 Making register request to: /auth/register')
    
//     try {
//       const { data } = await api.post<AuthResponse>('/auth/register', userData)
      
//       console.log('✅ Registration successful for user:', data.user.email, 'with role:', data.user.role)
//       return data
//     } catch (error: any) {
//       console.error('❌ Registration failed:', error.response?.data || error.message)
//       throw error
//     }
//   }

//   async logout(): Promise<void> {
//     try {
//       // Clear local storage
//       localStorage.removeItem('access_token')
//       localStorage.removeItem('refresh_token')
//       localStorage.removeItem('user')
      
//       // Optional: Call backend logout endpoint
//       await api.post('/auth/logout')
//     } catch (error) {
//       console.error('Logout error:', error)
//       // Clear storage anyway
//       localStorage.removeItem('access_token')
//       localStorage.removeItem('refresh_token')
//       localStorage.removeItem('user')
//     }
//   }

//   async refreshToken(): Promise<string> {
//     try {
//       const refreshToken = localStorage.getItem('refresh_token')
//       if (!refreshToken) {
//         throw new Error('No refresh token available')
//       }

//       const { data } = await api.post('/auth/refresh', {
//         refresh_token: refreshToken
//       })

//       localStorage.setItem('access_token', data.access_token)
//       return data.access_token
//     } catch (error) {
//       console.error('Token refresh failed:', error)
//       throw error
//     }
//   }

//   getCurrentUser(): User | null {
//     try {
//       const userString = localStorage.getItem('user')
//       return userString ? JSON.parse(userString) : null
//     } catch {
//       return null
//     }
//   }

//   getAccessToken(): string | null {
//     return localStorage.getItem('access_token')
//   }

//   isAuthenticated(): boolean {
//     return !!this.getAccessToken()
//   }

//   hasRole(role: UserRole): boolean {
//     const user = this.getCurrentUser()
//     return user?.role === role
//   }

//   isAdmin(): boolean {
//     return this.hasRole('admin')
//   }

//   isCustomer(): boolean {
//     return this.hasRole('customer')
//   }

//   isTechnician(): boolean {
//     return this.hasRole('technician')
//   }
// }

// export const authService = new AuthService()
























// frontend/src/services/auth.service.ts - Complete Version with Google OAuth

import { api } from './api'

export type UserRole = 'admin' | 'customer' | 'technician' | 'manager' | 'owner'

export interface User {
  id: string
  company_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: string
  permissions: string[]
  is_email_verified: boolean
  is_phone_verified: boolean
  avatar_url?: string
  google_id?: string
  created_at: string
  updated_at: string
  last_login?: string
  full_name: string
  display_name: string
  is_active: boolean
  is_admin: boolean
}

export interface LoginRequest {
  email: string
  password: string
  remember_me?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  role: UserRole
  company_name?: string // Optional, only needed for admin users
  phone?: string
  industry?: string 
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface PasswordResetConfirm { 
  token: string
  password: string
  password_confirm: string 
}

export interface ChangePasswordRequest { 
  current_password: string
  new_password: string
  new_password_confirm: string 
}

export interface UpdateProfileRequest { 
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  preferences?: any
}

export interface UserPreferences {
  language: string
  timezone: string
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
}

class AuthService {
  
  // ===== BASIC AUTHENTICATION =====
  
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 AuthService.login() called with:', { email: credentials.email })
    
    const params = new URLSearchParams()
    params.append('username', credentials.email)
    params.append('password', credentials.password)
    params.append('grant_type', 'password')
    if (credentials.remember_me) params.append('remember_me', 'true')

    console.log('📡 Making login request to: /auth/login')
    
    try {
      const { data } = await api.post('/auth/login', params, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
      })
      
      console.log('✅ Login successful, user role:', data.user.role)
      
      return {
        user: data.user,
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in || 3600
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error.response?.data || error.message)
      throw error
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    console.log('📝 AuthService.register() called with:', { 
      email: userData.email, 
      role: userData.role,
      company_name: userData.company_name 
    })
    
    console.log('📡 Making register request to: /auth/register')
    
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', userData)
      
      console.log('✅ Registration successful for user:', data.user.email, 'with role:', data.user.role)
      return data
    } catch (error: any) {
      console.error('❌ Registration failed:', error.response?.data || error.message)
      throw error
    }
  }

  async logout(): Promise<void> {
    console.log('🚪 AuthService.logout() called')
    
    try {
      // Optional: Call backend logout endpoint to invalidate server-side session
      await api.post('/auth/logout')
      console.log('✅ Server-side logout successful')
    } catch (error: any) {
      console.error('❌ Server-side logout failed:', error.response?.data || error.message)
      // Don't throw error for logout - we'll clear local state anyway
    } finally {
      // Always clear local storage
      this.clearLocalStorage()
      console.log('✅ Local storage cleared')
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    console.log('🔄 AuthService.refreshToken() called')
    
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const { data } = await api.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken
      })
      
      console.log('✅ Token refresh successful')
      return data
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message)
      throw error
    }
  }

  // ===== GOOGLE OAUTH =====

  async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    console.log('🔗 AuthService.getGoogleAuthUrl() called')
    
    try {
      const { data } = await api.get<{ auth_url: string }>('/auth/google/url')
      console.log('✅ Google auth URL generated')
      return data
    } catch (error: any) {
      console.error('❌ Failed to get Google auth URL:', error.response?.data || error.message)
      throw error
    }
  }

  async googleLogin(code: string): Promise<AuthResponse> {
    console.log('🔐 AuthService.googleLogin() called with code:', code.substring(0, 10) + '...')
    
    try {
      const { data } = await api.post<AuthResponse>('/auth/google/callback', { code })
      console.log('✅ Google login successful for user:', data.user.email)
      return data
    } catch (error: any) {
      console.error('❌ Google login failed:', error.response?.data || error.message)
      throw error
    }
  }

  // Helper method to initiate Google OAuth flow
  async initiateGoogleLogin(): Promise<void> {
    try {
      const response = await this.getGoogleAuthUrl()
      window.location.href = response.auth_url
    } catch (error) {
      console.error('❌ Failed to initiate Google login:', error)
      throw error
    }
  }

  // ===== USER MANAGEMENT =====

  async getCurrentUser(): Promise<User> {
    console.log('👤 AuthService.getCurrentUser() called')
    
    try {
      const { data } = await api.get<User>('/auth/me')
      console.log('✅ Current user fetched:', data.email)
      return data
    } catch (error: any) {
      console.error('❌ Get current user failed:', error.response?.data || error.message)
      throw error
    }
  }

  async updateProfile(profileData: UpdateProfileRequest): Promise<User> {
    console.log('📝 AuthService.updateProfile() called')
    
    try {
      const { data } = await api.put<User>('/auth/profile', profileData)
      console.log('✅ Profile updated successfully')
      
      // Update local storage
      this.updateLocalUser(data)
      return data
    } catch (error: any) {
      console.error('❌ Profile update failed:', error.response?.data || error.message)
      throw error
    }
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    console.log('🔒 AuthService.changePassword() called')
    
    try {
      const { data } = await api.post<{ message: string }>('/auth/change-password', passwordData)
      console.log('✅ Password changed successfully')
      return data
    } catch (error: any) {
      console.error('❌ Password change failed:', error.response?.data || error.message)
      throw error
    }
  }

  // ===== PASSWORD RESET =====

  async forgotPassword(email: string): Promise<{ message: string }> {
    console.log('🔑 AuthService.forgotPassword() called with email:', email)
    
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
      console.log('✅ Forgot password email sent')
      return data
    } catch (error: any) {
      console.error('❌ Forgot password failed:', error.response?.data || error.message)
      throw error
    }
  }

  async resetPassword(resetData: PasswordResetConfirm): Promise<{ message: string }> {
    console.log('🔑 AuthService.resetPassword() called')
    
    try {
      const { data } = await api.post<{ message: string }>('/auth/reset-password', resetData)
      console.log('✅ Password reset successful')
      return data
    } catch (error: any) {
      console.error('❌ Password reset failed:', error.response?.data || error.message)
      throw error
    }
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    console.log('🔍 AuthService.verifyResetToken() called')
    
    try {
      const { data } = await api.post<{ valid: boolean; message?: string }>('/auth/verify-reset-token', { token })
      console.log('✅ Reset token verified:', data.valid)
      return data
    } catch (error: any) {
      console.error('❌ Reset token verification failed:', error.response?.data || error.message)
      throw error
    }
  }

  // ===== EMAIL VERIFICATION =====

  async sendEmailVerification(): Promise<{ message: string }> {
    console.log('📧 AuthService.sendEmailVerification() called')
    
    try {
      const { data } = await api.post<{ message: string }>('/auth/send-verification-email')
      console.log('✅ Verification email sent')
      return data
    } catch (error: any) {
      console.error('❌ Send verification email failed:', error.response?.data || error.message)
      throw error
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    console.log('📧 AuthService.verifyEmail() called')
    
    try {
      const { data } = await api.post<{ message: string }>('/auth/verify-email', { token })
      console.log('✅ Email verified successfully')
      return data
    } catch (error: any) {
      console.error('❌ Email verification failed:', error.response?.data || error.message)
      throw error
    }
  }

  // ===== TOKEN MANAGEMENT =====

  async checkTokenValidity(): Promise<boolean> {
    try {
      await this.getCurrentUser()
      return true
    } catch {
      return false
    }
  }

  async refreshSessionIfNeeded(): Promise<AuthResponse | null> {
    try {
      return await this.refreshToken()
    } catch {
      return null
    }
  }

  // ===== COMPANY AND SUBSCRIPTION =====

  async getCompanySettings(): Promise<any> {
    console.log('🏢 AuthService.getCompanySettings() called')
    
    try {
      const { data } = await api.get('/auth/company/settings')
      return data
    } catch (error: any) {
      console.error('❌ Get company settings failed:', error.response?.data || error.message)
      throw error
    }
  }

  async updateCompanySettings(settings: any): Promise<any> {
    console.log('🏢 AuthService.updateCompanySettings() called')
    
    try {
      const { data } = await api.put('/auth/company/settings', settings)
      console.log('✅ Company settings updated')
      return data
    } catch (error: any) {
      console.error('❌ Company settings update failed:', error.response?.data || error.message)
      throw error
    }
  }

  async getUserSubscription(): Promise<any> {
    console.log('💳 AuthService.getUserSubscription() called')
    
    try {
      const { data } = await api.get('/auth/subscription')
      return data
    } catch (error: any) {
      console.error('❌ Get subscription failed:', error.response?.data || error.message)
      throw error
    }
  }

  async updateSubscription(planId: string): Promise<any> {
    console.log('💳 AuthService.updateSubscription() called with plan:', planId)
    
    try {
      const { data } = await api.post('/auth/subscription/update', { plan_id: planId })
      console.log('✅ Subscription updated')
      return data
    } catch (error: any) {
      console.error('❌ Subscription update failed:', error.response?.data || error.message)
      throw error
    }
  }

  // ===== SESSION VALIDATION =====

  async validateAndRefreshSession(): Promise<{ valid: boolean; user?: User }> {
    try {
      const user = await this.getCurrentUser()
      return { valid: true, user }
    } catch (error: any) {
      // If 401, try to refresh token
      if (error.response?.status === 401) {
        try {
          const authResponse = await this.refreshToken()
          this.setAuthData(authResponse)
          return { valid: true, user: authResponse.user }
        } catch (refreshError) {
          this.clearLocalStorage()
          return { valid: false }
        }
      }
      return { valid: false }
    }
  }

  // ===== LOCAL STORAGE HELPERS =====

  getCurrentUserFromStorage(): User | null {
    try {
      const userString = localStorage.getItem('user')
      return userString ? JSON.parse(userString) : null
    } catch {
      return null
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  setAuthData(authResponse: AuthResponse): void {
    localStorage.setItem('access_token', authResponse.access_token)
    localStorage.setItem('refresh_token', authResponse.refresh_token)
    localStorage.setItem('user', JSON.stringify(authResponse.user))
    localStorage.setItem('token_type', authResponse.token_type)
    localStorage.setItem('expires_in', authResponse.expires_in.toString())
  }

  updateLocalUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  }

  clearLocalStorage(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('token_type')
    localStorage.removeItem('expires_in')
  }

  // ===== AUTHENTICATION STATE =====

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUserFromStorage()
    return user?.role === role
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.getCurrentUserFromStorage()
    return user ? roles.includes(user.role) : false
  }

  isAdmin(): boolean {
    return this.hasRole('admin')
  }

  isOwner(): boolean {
    return this.hasRole('owner')
  }

  isCustomer(): boolean {
    return this.hasRole('customer')
  }

  isTechnician(): boolean {
    return this.hasRole('technician')
  }

  isManager(): boolean {
    return this.hasRole('manager')
  }

  // Check if user has admin-level access (admin or owner)
  isAdminLevel(): boolean {
    return this.hasAnyRole(['admin', 'owner'])
  }

  // Check if user has management-level access (admin, owner, or manager)
  isManagementLevel(): boolean {
    return this.hasAnyRole(['admin', 'owner', 'manager'])
  }

  // Check if user has staff-level access (not customer)
  isStaffLevel(): boolean {
    return this.hasAnyRole(['admin', 'owner', 'manager', 'technician'])
  }

  // ===== PERMISSIONS =====

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUserFromStorage()
    return user?.permissions.includes(permission) || false
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getCurrentUserFromStorage()
    if (!user) return false
    return permissions.some(permission => user.permissions.includes(permission))
  }

  hasAllPermissions(permissions: string[]): boolean {
    const user = this.getCurrentUserFromStorage()
    if (!user) return false
    return permissions.every(permission => user.permissions.includes(permission))
  }

  // ===== UTILITY METHODS =====

  getUserDisplayName(): string {
    const user = this.getCurrentUserFromStorage()
    return user?.display_name || user?.full_name || user?.email || 'User'
  }

  getUserInitials(): string {
    const user = this.getCurrentUserFromStorage()
    if (!user) return 'U'
    
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user.email.charAt(0).toUpperCase()
  }

  getUserAvatarUrl(): string | null {
    const user = this.getCurrentUserFromStorage()
    return user?.avatar_url || null
  }

  // ===== AUTO REFRESH SETUP =====

  private refreshInterval: NodeJS.Timeout | null = null

  startAutoRefresh(): void {
    // Refresh token every 30 minutes
    this.refreshInterval = setInterval(async () => {
      try {
        const authResponse = await this.refreshToken()
        this.setAuthData(authResponse)
        console.log('🔄 Token auto-refreshed successfully')
      } catch (error) {
        console.error('❌ Auto token refresh failed:', error)
        this.clearLocalStorage()
        // Redirect to login or emit event
        window.location.href = '/login'
      }
    }, 30 * 60 * 1000) // 30 minutes
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }
}

export const authService = new AuthService()
export default authService