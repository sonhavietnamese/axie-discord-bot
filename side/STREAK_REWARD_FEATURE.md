# 🔥 Streak Reward Feature

## Overview
The new streak reward feature rewards players who achieve a streak of 3 or more consecutive correct guesses without skipping any rounds or making incorrect guesses.

## How It Works

### 1. Qualification Criteria
For a player to qualify for streak rewards, they must have:
- **Minimum 3 consecutive correct guesses**
- **No skipped rounds** in the streak sequence
- **No failed guesses** in the streak sequence

### 2. Streak Detection
The system analyzes all user guesses to find the longest qualifying streak by:
- Sorting guesses by round ID to ensure chronological order
- Checking for consecutive round participation (no gaps)
- Verifying all guesses in the streak are correct
- Calculating total candies earned during the streak

### 3. Button Display
When a user runs `/guess-history` and qualifies for streak rewards:
- A special message appears: **"🔥 STREAK MASTER DETECTED! 🔥"**
- Shows streak information (rounds and total candies)
- Displays a green button: **"Claim X.XX Candies Reward 🎁"**

### 4. Reward Claiming
When the button is clicked:
- Verifies the user clicking is the owner of the streak
- Calls a mock API to process the reward
- Returns one of several possible rewards:
  - 🎉 Special NFT (Streak Master Badge)
  - 🔥 Premium currency conversion (1.5x multiplier)
  - ⭐ VIP lounge access (30 days)
- Button becomes disabled after successful claim
- Shows ephemeral success/error message

## Examples

### ✅ Qualifying Streaks
```typescript
// Perfect 3-streak (minimum)
Round 1: ✅ Correct (2.5 candies)
Round 2: ✅ Correct (3.0 candies)  
Round 3: ✅ Correct (2.8 candies)
// Total: 8.3 candies, 3 rounds → QUALIFIED

// Perfect 5-streak
Round 1: ✅ Correct (2.5 candies)
Round 2: ✅ Correct (3.0 candies)
Round 3: ✅ Correct (2.8 candies)
Round 4: ✅ Correct (3.2 candies)
Round 5: ✅ Correct (2.9 candies)
// Total: 14.4 candies, 5 rounds → QUALIFIED
```

### ❌ Non-Qualifying Scenarios
```typescript
// Skipped round
Round 1: ✅ Correct (2.5 candies)
Round 3: ✅ Correct (3.0 candies) // Skipped round 2
Round 4: ✅ Correct (2.8 candies)
// → NOT QUALIFIED (gap in sequence)

// Failed guess
Round 1: ✅ Correct (2.5 candies)
Round 2: ❌ Incorrect (0 candies)
Round 3: ✅ Correct (2.8 candies)
// → NOT QUALIFIED (streak broken)

// Too few rounds
Round 1: ✅ Correct (2.5 candies)
Round 2: ✅ Correct (3.0 candies)
// → NOT QUALIFIED (only 2 rounds)
```

## API Integration

### Mock API Service
The feature includes a mock API service that simulates:
- **Network delay** (1 second)
- **Success responses** with different reward types
- **Occasional failures** (10% chance)
- **Logging** for debugging

### API Response Format
```typescript
{
  success: boolean
  message: string
  reward?: {
    type: 'NFT' | 'Premium Currency' | 'VIP Access'
    name?: string
    rarity?: string
    amount?: number
    duration?: string
  }
}
```

## Technical Implementation

### Files Modified/Created
- `src/services/api.service.ts` - Mock API service
- `src/utils/streak.utils.ts` - Streak qualification logic
- `src/commands/guess-history.ts` - Added button display
- `src/events/interactionCreate.ts` - Button click handler
- `src/examples/streak-reward-demo.ts` - Demo and testing

### Key Functions
- `checkStreakRewardQualification()` - Analyzes user guesses for streak eligibility
- `apiService.claimStreakReward()` - Processes reward claim via mock API
- Button interaction handler - Manages click events and UI updates

## Testing

Run the demo script to see the feature in action:
```bash
bun run src/examples/streak-reward-demo.ts
```

This will demonstrate:
- Streak qualification detection
- API call simulation
- Different scenarios (qualified vs not qualified)

## User Experience Flow

1. **User runs `/guess-history`**
2. **System checks streak qualification**
3. **If qualified**: Shows special message + button
4. **User clicks button**
5. **System validates user ownership**
6. **API call processes reward**
7. **Success message shown + button disabled**
8. **User receives reward notification**

## Benefits

- **Encourages consistent participation** in game rounds
- **Rewards skill and dedication** with meaningful prizes
- **Provides clear feedback** on streak progress
- **Creates engaging user interaction** with button mechanics
- **Integrates seamlessly** with existing command structure

The feature enhances the game's engagement by rewarding players for consistent performance while maintaining the existing user experience. 