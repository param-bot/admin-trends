export interface AdminUser {
  id: string
  username: string
  email: string
  status: string
  is_email_verified: number
  is_internal: number
  role_id: number
  signup_method: string
  last_login: string | null
  created_at: string
  updated_at: string
  country_name: string | null
  country_code: string | null
  account_id: string
}
