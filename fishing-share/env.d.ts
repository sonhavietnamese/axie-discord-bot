export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_CLIENT_ID: string
      DISCORD_TOKEN: string
      NODE_OPTIONS: string
      STORE_STATUS: 'open' | 'closed'
      GAME_READY_DURATION: string
      REALM_ID: string
      CURRENCY_ID: string
      DRIP_API_KEY: string
      RONIN_PROJECT_ID: string
      RONIN_API_KEY: string
      RONIN_TRACKING_AUTHORIZATION: string
      VERSION: string
    }
  }
}
