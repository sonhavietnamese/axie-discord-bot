export {}

declare module 'bun:sqlite' {
  export class Database {
    constructor(path: string)
    query(sql: string): any
    run(sql: string): any
    close(): void
    // Add other methods as needed
  }
}

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
    }
  }
}
