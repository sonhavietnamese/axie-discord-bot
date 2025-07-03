// Demo script to test the claimed rewards tracking functionality
import { checkStreakRewardQualification } from '../utils/streak.utils'
import { rewardService } from '../services/reward.service'
import { apiService } from '../services/api.service'

// Mock user data with multiple streaks
const mockUserGuesses = [
  // First streak (rounds 1-4) - should be claimable
  { roundId: '1', isCorrect: true, candiesWon: 2.5 },
  { roundId: '2', isCorrect: true, candiesWon: 3.0 },
  { roundId: '3', isCorrect: true, candiesWon: 2.8 },
  { roundId: '4', isCorrect: true, candiesWon: 3.2 },

  // Break the streak
  { roundId: '5', isCorrect: false, candiesWon: 0 },

  // Second streak (rounds 6-9) - new streak after claim
  { roundId: '6', isCorrect: true, candiesWon: 2.7 },
  { roundId: '7', isCorrect: true, candiesWon: 3.1 },
  { roundId: '8', isCorrect: true, candiesWon: 2.9 },
  { roundId: '9', isCorrect: true, candiesWon: 3.3 },

  // Continue playing
  { roundId: '10', isCorrect: true, candiesWon: 2.8 },
]

async function demonstrateClaimedRewards() {
  console.log('💰 Claimed Rewards Tracking Demo')
  console.log('=====================================')

  const userId = 'demo_user_123'

  // Step 1: Check initial qualification
  console.log('📊 Step 1: Initial streak qualification check')
  let streakReward = await checkStreakRewardQualification(userId, mockUserGuesses)
  console.log(`   Qualified: ${streakReward.qualified}`)
  console.log(`   Streak: ${streakReward.streakRounds} rounds (${streakReward.streakCandies.toFixed(2)} candies)`)
  console.log(`   Range: Rounds ${streakReward.startRoundId}-${streakReward.endRoundId}`)
  console.log(`   Details: ${streakReward.details}`)
  console.log('')

  if (streakReward.qualified) {
    // Step 2: Claim the first streak
    console.log('🎁 Step 2: Claiming the first streak')
    const claimResult = await apiService.claimStreakReward(
      userId,
      streakReward.streakCandies,
      streakReward.streakRounds,
      streakReward.startRoundId!,
      streakReward.endRoundId!,
    )

    console.log(`   Claim successful: ${claimResult.success}`)
    console.log(`   Message: ${claimResult.message}`)
    console.log('')

    // Step 3: Check qualification after claim
    console.log('🔄 Step 3: Check qualification after claim')
    streakReward = await checkStreakRewardQualification(userId, mockUserGuesses)
    console.log(`   Qualified: ${streakReward.qualified}`)
    console.log(`   Streak: ${streakReward.streakRounds} rounds (${streakReward.streakCandies.toFixed(2)} candies)`)
    if (streakReward.startRoundId && streakReward.endRoundId) {
      console.log(`   Range: Rounds ${streakReward.startRoundId}-${streakReward.endRoundId}`)
    }
    console.log(`   Details: ${streakReward.details}`)
    console.log('')

    // Step 4: Show claim history
    console.log('📜 Step 4: Claim history')
    const claimHistory = await rewardService.getClaimHistory(userId, 5)
    console.log(rewardService.formatClaimHistory(claimHistory))
    console.log('')

    // Step 5: Try to claim the same streak again (should fail)
    console.log('❌ Step 5: Try to claim the same streak again')
    const duplicateClaimResult = await apiService.claimStreakReward(
      userId,
      11.5, // Original first streak candies
      4, // Original first streak rounds
      1, // Original start
      4, // Original end
    )
    console.log(`   Claim successful: ${duplicateClaimResult.success}`)
    console.log(`   Message: ${duplicateClaimResult.message}`)
    console.log('')

    // Step 6: Claim the second streak if qualified
    if (streakReward.qualified && !streakReward.alreadyClaimed) {
      console.log('🎁 Step 6: Claiming the second streak')
      const secondClaimResult = await apiService.claimStreakReward(
        userId,
        streakReward.streakCandies,
        streakReward.streakRounds,
        streakReward.startRoundId!,
        streakReward.endRoundId!,
      )

      console.log(`   Claim successful: ${secondClaimResult.success}`)
      console.log(`   Message: ${secondClaimResult.message}`)
      console.log('')

      // Show updated claim history
      console.log('📜 Updated claim history:')
      const updatedHistory = await rewardService.getClaimHistory(userId, 5)
      console.log(rewardService.formatClaimHistory(updatedHistory))
    }
  }
}

// Test scenarios with different claim states
async function testClaimScenarios() {
  console.log('\n🎮 Testing Different Claim Scenarios:')
  console.log('=====================================')

  const scenarios = [
    {
      name: 'New user (no claims)',
      userId: 'new_user_456',
      guesses: [
        { roundId: '10', isCorrect: true, candiesWon: 2.5 },
        { roundId: '11', isCorrect: true, candiesWon: 3.0 },
        { roundId: '12', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'User with claimed streak (building new one)',
      userId: 'experienced_user_789',
      guesses: [
        // This will be after setting up a claimed streak
        { roundId: '15', isCorrect: true, candiesWon: 2.7 },
        { roundId: '16', isCorrect: true, candiesWon: 3.1 },
        { roundId: '17', isCorrect: true, candiesWon: 2.9 },
      ],
    },
  ]

  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}:`)

    // For the experienced user, create a mock claim first
    if (scenario.name.includes('claimed streak')) {
      await rewardService.claimReward(
        scenario.userId,
        3, // 3 rounds
        7.5, // Total candies
        10, // Start round
        12, // End round
        'NFT', // Reward type
        { type: 'NFT', name: 'Mock Badge' },
      )
    }

    const result = await checkStreakRewardQualification(scenario.userId, scenario.guesses)
    console.log(`   Qualified: ${result.qualified}`)
    console.log(`   Details: ${result.details}`)

    const history = await rewardService.getClaimHistory(scenario.userId, 3)
    if (history.length > 0) {
      console.log(`   Previous claims: ${history.length}`)
    }
  }
}

// Run the demos
if (require.main === module) {
  demonstrateClaimedRewards()
    .then(() => testClaimScenarios())
    .catch(console.error)
}

export { demonstrateClaimedRewards, testClaimScenarios }
