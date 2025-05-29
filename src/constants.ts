import { Colors } from 'discord.js'

export const ADMIN_DISCORD_IDS = ['852110112264945704']

export const CHIMERA_MAX_HEALTH = 10e6

export const DAMAGE = [
  {
    type: 'normal',
    damage: [0, 10e3],
    color: Colors.Blurple,
  },
  {
    type: 'super',
    damage: [10e3, 10e4],
    color: Colors.Green,
  },
  {
    type: 'critical',
    damage: [10e4, 10e5],
    color: Colors.Red,
  },
]

export const axies = ['bing', 'hope', 'buba', 'machito', 'momo', 'shillin', 'tripp', 'pomodoro', 'venoki', 'xia']

export const positions = [
  {
    x: 10,
    y: 522,
    width: 200,
    height: 200,
    direction: 1,
  },
  {
    x: 318,
    y: 546,
    width: 205,
    height: 205,
    direction: 1,
  },
  {
    x: 228,
    y: 658,
    width: 220,
    height: 220,
    direction: 1,
  },
  {
    x: 472,
    y: 694,
    width: 240,
    height: 240,
    direction: 1,
  },
  {
    x: 28,
    y: 703,
    width: 250,
    height: 250,
    direction: 1,
  },

  {
    x: 1130,
    y: 526,
    width: 200,
    height: 200,
    direction: -1,
  },

  {
    x: 849,
    y: 629,
    width: 220,
    height: 220,
    direction: -1,
  },

  {
    x: 1235,
    y: 642,
    width: 230,
    height: 230,
    direction: -1,
  },

  {
    x: 1010,
    y: 729,
    width: 240,
    height: 240,
    direction: -1,
  },

  {
    x: 1483,
    y: 728,
    width: 250,
    height: 250,
    direction: -1,
  },
]
