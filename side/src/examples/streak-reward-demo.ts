// Demo script showing the new streak reward feature
import { checkStreakRewardQualification } from '../utils/streak.utils'
import { apiService } from '../services/api.service'

// Mock user guess data for demonstration
const mockUserGuesses = [
  // Perfect 5-round streak
  { roundId: '1', isCorrect: true, candiesWon: 2.5 },
  { roundId: '2', isCorrect: true, candiesWon: 3.0 },
  { roundId: '3', isCorrect: true, candiesWon: 2.8 },
  { roundId: '4', isCorrect: true, candiesWon: 3.2 },
  { roundId: '5', isCorrect: true, candiesWon: 2.9 },
  // Streak broken
  { roundId: '6', isCorrect: false, candiesWon: 0 },
  // New streak starting
  { roundId: '7', isCorrect: true, candiesWon: 3.1 },
  { roundId: '8', isCorrect: true, candiesWon: 2.7 },
  { roundId: '9', isCorrect: true, candiesWon: 3.3 },
]

async function demonstrateStreakReward() {
  console.log('🎯 Streak Reward Feature Demo')
  console.log('=====================================')

  // Check if user qualifies for streak reward
  const streakReward = checkStreakRewardQualification(mockUserGuesses)

  console.log('📊 User Guess Analysis:')
  console.log(`- Total guesses: ${mockUserGuesses.length}`)
  console.log(`- Qualified for streak reward: ${streakReward.qualified}`)
  console.log(`- Best streak length: ${streakReward.streakRounds} rounds`)
  console.log(`- Streak candies value: ${streakReward.streakCandies.toFixed(2)}`)

  if (streakReward.qualified) {
    console.log('\n🎁 User qualifies for streak reward!')
    console.log('Button would be shown in Discord with:')
    console.log(`- Label: "Claim ${streakReward.streakCandies.toFixed(2)} Candies Reward"`)
    console.log(`- CustomId: "claim_streak_reward:USER_ID:${streakReward.streakCandies}"`)

    // Simulate API call
    console.log('\n🔄 Simulating API call...')
    try {
      const result = await apiService.claimStreakReward('demo_user_123', streakReward.streakCandies)
      console.log('✅ API Response:', result)
    } catch (error) {
      console.log('❌ API Error:', error)
    }
  } else {
    console.log('\n❌ User does not qualify for streak reward')
    console.log('Requirements: 3+ consecutive correct guesses with no skipped rounds')
  }
}

// Demo different scenarios
async function demoScenarios() {
  console.log('\n🎮 Testing Different Scenarios:')
  console.log('=====================================')

  const scenarios = [
    {
      name: 'Perfect 3-streak (minimum qualification)',
      guesses: [
        { roundId: '1', isCorrect: true, candiesWon: 2.5 },
        { roundId: '2', isCorrect: true, candiesWon: 3.0 },
        { roundId: '3', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'Skipped round (not qualified)',
      guesses: [
        { roundId: '1', isCorrect: true, candiesWon: 2.5 },
        { roundId: '3', isCorrect: true, candiesWon: 3.0 }, // Skipped round 2
        { roundId: '4', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'Failed guess (not qualified)',
      guesses: [
        { roundId: '1', isCorrect: true, candiesWon: 2.5 },
        { roundId: '2', isCorrect: false, candiesWon: 0 }, // Failed guess
        { roundId: '3', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'Too few guesses (not qualified)',
      guesses: [
        { roundId: '1', isCorrect: true, candiesWon: 2.5 },
        { roundId: '2', isCorrect: true, candiesWon: 3.0 },
      ],
    },
  ]

  for (const scenario of scenarios) {
    console.log(`\n📋 ${scenario.name}:`)
    const result = checkStreakRewardQualification(scenario.guesses)
    console.log(`   Qualified: ${result.qualified}`)
    console.log(`   Streak: ${result.streakRounds} rounds`)
    console.log(`   Candies: ${result.streakCandies.toFixed(2)}`)
  }
}

// Run the demos
if (require.main === module) {
  demonstrateStreakReward()
    .then(() => demoScenarios())
    .catch(console.error)
}

export { demonstrateStreakReward, demoScenarios }
