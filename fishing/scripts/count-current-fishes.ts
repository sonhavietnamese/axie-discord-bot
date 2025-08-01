import { db } from '../src/libs/database'
import { users } from '../src/schema'
import { migrateInventory } from '../src/schema'
import { FISHES } from '../src/configs/fishes'

async function countCurrentFishes() {
  console.log('🐟 Starting fish count across all users...')

  try {
    // Get all users from the database
    const allUsers = await db.select().from(users)
    console.log(`📊 Found ${allUsers.length} users in the database`)

    // Initialize fish counters (001-006, excluding 000 which is trash)
    const fishCounts: Record<string, number> = {
      '001': 0,
      '002': 0,
      '003': 0,
      '004': 0,
      '005': 0,
      '006': 0,
    }

    // Create price lookup map for fishes 001-006
    const fishPrices: Record<string, number> = {}
    FISHES.forEach((fish) => {
      if (fish.id >= '001' && fish.id <= '006') {
        fishPrices[fish.id] = fish.price
      }
    })

    let totalUsersWithInventory = 0
    let totalUsersProcessed = 0

    // Process each user's inventory
    for (const user of allUsers) {
      totalUsersProcessed++

      try {
        // Parse and migrate inventory to ensure proper format
        const inventory = migrateInventory(user.inventory)

        // Count fishes 001-006
        for (const fishId of ['001', '002', '003', '004', '005', '006']) {
          const count = inventory.fishes[fishId] || 0
          fishCounts[fishId] += count
        }

        // Check if user has any fishes
        const hasFishes = Object.values(inventory.fishes).some((count) => count > 0)
        if (hasFishes) {
          totalUsersWithInventory++
        }

        // Log progress every 100 users
        if (totalUsersProcessed % 100 === 0) {
          console.log(`⏳ Processed ${totalUsersProcessed}/${allUsers.length} users...`)
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.id}:`, error)
      }
    }

    // Display results
    console.log('\n🎯 FISH COUNT RESULTS:')
    console.log('=====================')

    let totalFishes = 0
    let totalValue = 0

    for (const [fishId, count] of Object.entries(fishCounts)) {
      const price = fishPrices[fishId] || 0
      const value = count * price
      totalValue += value

      console.log(`🐟 Fish ${fishId}: ${count.toLocaleString()} (${price} candies each = ${value.toFixed(2)} candies)`)
      totalFishes += count
    }

    console.log('=====================')
    console.log(`📈 Total fishes (001-006): ${totalFishes.toLocaleString()}`)
    console.log(`💰 Total estimated value: ${totalValue.toFixed(2)} candies`)
    console.log(`👥 Users with inventory: ${totalUsersWithInventory}`)
    console.log(`👤 Total users processed: ${totalUsersProcessed}`)

    // Calculate average fishes per user
    if (totalUsersWithInventory > 0) {
      const avgFishesPerUser = totalFishes / totalUsersWithInventory
      const avgValuePerUser = totalValue / totalUsersWithInventory
      console.log(`📊 Average fishes per user (with inventory): ${avgFishesPerUser.toFixed(2)}`)
      console.log(`💰 Average value per user (with inventory): ${avgValuePerUser.toFixed(2)} candies`)
    }

    // Show fish distribution percentages
    console.log('\n📊 FISH DISTRIBUTION:')
    console.log('=====================')
    for (const [fishId, count] of Object.entries(fishCounts)) {
      const percentage = totalFishes > 0 ? ((count / totalFishes) * 100).toFixed(1) : '0.0'
      const price = fishPrices[fishId] || 0
      const value = count * price
      const valuePercentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
      console.log(`🐟 Fish ${fishId}: ${percentage}% of quantity, ${valuePercentage}% of value`)
    }
  } catch (error) {
    console.error('❌ Error counting fishes:', error)
  } finally {
    // Close database connection
    await db.run('SELECT 1') // Simple query to ensure connection is active
    console.log('\n✅ Fish count completed!')
  }
}

// Run the script
countCurrentFishes()
  .then(() => {
    console.log('🎉 Script finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  })
