export interface GameProvider {
  id: string
  name: string
}

export interface GameProvidersQuery {
  page: number
  limit: number
  name?: string
}

export interface GameProvidersPage {
  items: GameProvider[]
  hasMore: boolean
}
