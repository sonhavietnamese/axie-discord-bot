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
    }
  }
}
