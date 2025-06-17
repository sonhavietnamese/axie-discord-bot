import { userService, fishService, disconnectDatabase } from '../src/libs/database'

async function testDatabase() {
  try {
    console.log('🧪 Testing database integration...')

    // Test 1: Get all fish
    console.log('\n1. Testing fish retrieval...')
    const allFish = await fishService.getAllFish()
    console.log(`✅ Found ${allFish.length} fish in database:`)
    allFish.forEach((fish) => {
      console.log(`   - ${fish.name} (${fish.rarity}): ${fish.description}`)
    })

    // Test 2: Get random fish
    console.log('\n2. Testing random fish selection...')
    const randomFish = await fishService.getRandomFish()
    if (randomFish) {
      console.log(`✅ Random fish: ${randomFish.name} (${randomFish.rarity})`)
    } else {
      console.log('❌ No random fish returned')
    }

    // Test 3: Create a test user
    console.log('\n3. Testing user creation...')
    const testUser = await userService.getOrCreateUser('test_user_123', 'TestUser')
    console.log(`✅ Created/Retrieved user: ${testUser.name} with ${testUser.fish} fish`)

    // Test 4: Add a fish to user's collection
    if (randomFish) {
      console.log('\n4. Testing fish catch...')
      const updatedUser = await userService.addFish('test_user_123', randomFish.id)
      console.log(`✅ User caught ${randomFish.name}! Total fish: ${updatedUser.fish}`)
    }

    // Test 5: Get user stats
    console.log('\n5. Testing user stats...')
    const userStats = await userService.getUserStats('test_user_123')
    if (userStats) {
      console.log(`✅ User stats:`)
      console.log(`   - Total fish: ${userStats.totalFish}`)
      console.log(`   - Unique types: ${userStats.uniqueFishTypes}`)
      console.log(`   - Rare fish: ${userStats.raresFishCaught}`)
      console.log(`   - Recent catches: ${userStats.recentCatches.length}`)
    } else {
      console.log('❌ Could not retrieve user stats')
    }

    console.log('\n🎉 All database tests completed successfully!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    await disconnectDatabase()
    console.log('🔌 Database connection closed')
  }
}

testDatabase()
