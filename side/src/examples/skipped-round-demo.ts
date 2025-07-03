// Demo script to test the improved skipped round detection
import { checkStreakRewardQualification, detectSkippedRounds } from '../utils/streak.utils'
import { formatGuessHistory } from '../utils/message.utils'
import { AXIE_NAMES } from '../constants/axies'

// User's exact scenario: rounds 22, 23, 25 (skipped 24)
const userScenario = [
  { roundId: '25', isCorrect: true, candiesWon: 0.67, axieId: '004', guess: 'puff' },
  { roundId: '23', isCorrect: true, candiesWon: 0.67, axieId: '002', guess: 'machito' },
  { roundId: '22', isCorrect: true, candiesWon: 0.67, axieId: '010', guess: 'xia' },
]

function demonstrateSkippedRoundDetection() {
  console.log('🔍 Skipped Round Detection Demo')
  console.log('=====================================')
  console.log('User scenario: Rounds 22, 23, 25 (skipped 24)')
  console.log('')

  // Test skipped round detection
  const roundsWithSkips = detectSkippedRounds(userScenario)
  console.log('📊 Detected rounds:')
  roundsWithSkips.forEach((round) => {
    const status = round.type === 'skipped' ? '⏭️ SKIPPED' : '✅ Participated'
    console.log(`   Round ${round.roundId}: ${status}`)
  })
  console.log('')

  // Test streak qualification
  const streakReward = checkStreakRewardQualification(userScenario)
  console.log('🎯 Streak Qualification Analysis:')
  console.log(`   Qualified: ${streakReward.qualified}`)
  console.log(`   Streak Rounds: ${streakReward.streakRounds}`)
  console.log(`   Streak Candies: ${streakReward.streakCandies.toFixed(2)}`)
  console.log(`   Details: ${streakReward.details}`)
  console.log('')

  // Test formatted display
  const formattedHistory = formatGuessHistory(
    userScenario.map((guess) => ({
      ...guess,
      streakAtTime: { roundId: guess.roundId, streak: 0 },
    })),
    AXIE_NAMES,
  )

  console.log('📋 Formatted Display:')
  console.log('🕒 Recent History (Last 4 rounds):')
  console.log('')
  formattedHistory.forEach((line) => console.log(line + '\n'))
}

// Test different scenarios
function testVariousScenarios() {
  console.log('🎮 Testing Various Scenarios:')
  console.log('=====================================')

  const scenarios = [
    {
      name: 'Perfect 3-streak (consecutive)',
      data: [
        { roundId: '3', isCorrect: true, candiesWon: 2.5 },
        { roundId: '2', isCorrect: true, candiesWon: 3.0 },
        { roundId: '1', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'User scenario (skipped round 24)',
      data: userScenario,
    },
    {
      name: 'Multiple skipped rounds',
      data: [
        { roundId: '10', isCorrect: true, candiesWon: 2.5 },
        { roundId: '7', isCorrect: true, candiesWon: 3.0 },
        { roundId: '6', isCorrect: true, candiesWon: 2.8 },
      ],
    },
    {
      name: 'Mixed correct/incorrect',
      data: [
        { roundId: '5', isCorrect: true, candiesWon: 2.5 },
        { roundId: '4', isCorrect: false, candiesWon: 0 },
        { roundId: '3', isCorrect: true, candiesWon: 2.8 },
        { roundId: '2', isCorrect: true, candiesWon: 3.0 },
        { roundId: '1', isCorrect: true, candiesWon: 2.2 },
      ],
    },
  ]

  scenarios.forEach((scenario) => {
    console.log(`\n📋 ${scenario.name}:`)
    const result = checkStreakRewardQualification(scenario.data)
    console.log(`   Qualified: ${result.qualified}`)
    console.log(`   Details: ${result.details}`)

    if (scenario.data.length <= 5) {
      const rounds = detectSkippedRounds(scenario.data)
      console.log(`   Round sequence: ${rounds.map((r) => `${r.roundId}${r.type === 'skipped' ? '(skip)' : ''}`).join(', ')}`)
    }
  })
}

// Run the demos
if (require.main === module) {
  demonstrateSkippedRoundDetection()
  console.log('\n' + '='.repeat(50) + '\n')
  testVariousScenarios()
}

export { demonstrateSkippedRoundDetection, testVariousScenarios }
