# Fishing Discord Bot

## Project Overview

A Discord bot game where players can buy rods, catch fish, and interact with a rod store managed by a store owner. The game features events, inventory management, and a unique fishing mini-game.

## Main Features

- **Fishing Events**
  - Admins can start and stop fishing events in specific channels.
  - Players join events and participate in fishing sessions.
  - Fishing is performed via interactive Discord messages and button/emoji reactions.

- **Rod Store**
  - Players can buy rods from the Rod Store using in-game currency (candies).
  - The Rod Store is managed by a store owner (intern), who can restock rods.
  - Players can only own one rod at a time.
  - Rods have limited uses and different types (e.g., Branch, Mavis, BALD), each with unique stats.

- **Store Owner Management**
  - A user is assigned as the store owner (intern) and can restock the rod inventory.
  - Store owner actions are managed via dedicated commands.

- **Fishing Mechanics**
  - Players use rods to catch fish during events.
  - Each rod has a limited number of uses; using a rod reduces its durability.
  - The fishing mini-game involves pressing buttons in a specific sequence to catch fish.
  - The rarity and type of fish caught depend on the player's performance and rod type.
  - Caught fish and rods are tracked in each player's inventory.

- **Inventory & Progression**
  - Players can view their inventory, including rods and caught fish.
  - Inventory is updated after each fishing attempt.
  - Players can sell all items in their inventory for candies.

- **Commands**
  - `/fishing start` - Admin: Start a fishing event
  - `/fishing stop` - Admin: Stop a fishing event
  - `/fishing log` - Admin: View event logs
  - `/cast` - Player: Start fishing
  - `/inventory` - Player: View inventory
  - `/rod` - Player: View rod status
  - `/fishing-store rod` - Player: Buy a rod
  - `/fishing-store et` - Player: Visit ET's Seafood Store

## Game Flow Summary

- Admin starts a fishing event.
- Players join and ensure they have a rod (buy from store if needed).
- Players use `/cast` to start fishing, play the mini-game, and catch fish.
- Rods lose durability with each use; players must buy new rods when needed.
- Store owner manages rod stock in the store.
- Players can view and manage their inventory and sell items for candies.

---

_This README summarizes the main features and flows. For more details, see the source code and configs._