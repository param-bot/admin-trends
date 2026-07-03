// Every analytics-service response (not just player-trends) is wrapped in
// this envelope — see player-trends-api-reference.md §2. Always read the
// payload off `data`, never off the top level.

export interface ApiSuccessEnvelope<T> {
  success: true
  message: string
  statusCode: number
  timestamp: string
  data: T
}

export interface ApiErrorEnvelope {
  success: false
  data: null
  error: {
    code: string
    message: string
    details: string
  }
  timestamp: string
  path: string
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope
