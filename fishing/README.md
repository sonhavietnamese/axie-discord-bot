# Fishing

Flow:
1 Admin can start the fishing event by slash command: /fishing start
2 User join by reacting to the message
3 User reacted will be gift a fishing rod
4 Each rod can be used 5 times (can be configured)
5 User start fishing by slash command: /fishing
6 Bot will return a fishing message with the guidance and message for user to react
7 The fishing mechanism is based on react to the message
8 The fishing message will contain like this: 
  React the emoji in order to catch the fish: 🍎🍤👾
9 The emojis will be random
10 User can react to the message to catch the fish
11 Check if user has already reacted to the message with the same emoji and same order
12 Has a button to confirm the fishing
13 If user confirm the fishing, bot will check if the user has already reacted to the message with the same emoji and same order, then random the fish


Admin:
- /fishing start
- /fishing stop
- /fishing log

Player:
- /cast
- /basket