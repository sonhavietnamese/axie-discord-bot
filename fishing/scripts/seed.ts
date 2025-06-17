import { seedFishData, disconnectDatabase } from '../src/libs/database'

async function main() {
  try {
    console.log('🌱 Seeding database with default fish data...')
    await seedFishData()
    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await disconnectDatabase()
  }
}

main()
