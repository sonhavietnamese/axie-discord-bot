import { Colors, type ChatInputCommandInteraction } from 'discord.js'
import fs from 'fs'
import font2base64 from 'node-font2base64'
import nodeHtmlToImage from 'node-html-to-image'
import path from 'path'
import { createCommandConfig, Flashcore, logger } from 'robo.js'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { axies, CHIMERA_MAX_HEALTH, positions } from '../constants'
import { abbreviateNumber, hashCode, isAdmin, require } from '../libs/utils'
import { Warrior } from '../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'background.jpg'))
const base64Image = Buffer.from(image).toString('base64')
const dataURI = 'data:image/jpeg;base64,' + base64Image

const axieDataURI = axies.map((axie) => {
  const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'axies', `${axie}.png`))
  const base64Image = Buffer.from(image).toString('base64')
  return 'data:image/png;base64,' + base64Image
})

const font = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', 'assets', 'Rowdies-Bold.ttf'))

export const config = createCommandConfig({
  description: 'Summon the Chimera',
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Summon command used by ${interaction.user}`)
  await require(isAdmin(interaction.user.id), 'You are not authorized to start an arena', interaction)

  // Defer the reply since image generation might take some time
  await interaction.deferReply()

  // Reset health monitoring thresholds for the new boss
  await Flashcore.clear()

  // Set the boss health
  await Flashcore.set(`chimera:max-health`, CHIMERA_MAX_HEALTH)
  await Flashcore.set(`chimera:current-health`, CHIMERA_MAX_HEALTH)

  const imageBuffer = await generateImage()

  // reduce image size using sharp
  const resizedImage = await sharp(imageBuffer as Buffer)
    .resize(1920, 969)
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer()

  await interaction.editReply({
    content: 'Chimera summoned!',
    embeds: [
      {
        color: Colors.Blurple,
        title: 'Chimera summoned!',
        description:
          'Use command `/hit chimera` to deal damage to the Chimera!\n\n📊 **Auto-monitoring enabled** - Live status will be posted below.',
      },
    ],
    files: [
      {
        attachment: Buffer.from(resizedImage as Buffer),
        contentType: 'image/jpeg',
        name: 'chimera.jpeg',
      },
    ],
  })

  await gameloop(interaction)
}

const gameloop = async (interaction: ChatInputCommandInteraction) => {
  const repliedThresholds = new Set<string>() // Track which thresholds have been triggered

  setInterval(async () => {
    const currentBossHealth = await Flashcore.get<number>(`chimera:current-health`)
    const maxBossHealth = await Flashcore.get<number>(`chimera:max-health`)
    const healthPercentage = (currentBossHealth / maxBossHealth) * 100

    // Determine threshold tier
    const getThresholdTier = (percentage: number): string => {
      switch (true) {
        case percentage <= 0:
          return 'defeated'
        case percentage <= 5:
          return 'critical'
        case percentage <= 10:
          return 'danger'
        case percentage <= 20:
          return 'low'
        case percentage <= 30:
          return 'medium-low'
        case percentage <= 40:
          return 'medium'
        case percentage <= 50:
          return 'medium-high'
        case percentage <= 60:
          return 'high'
        case percentage <= 70:
          return 'very-high'
        case percentage <= 80:
          return 'near-full'
        case percentage <= 90:
          return 'almost-full'
        default:
          return 'full'
      }
    }

    const currentTier = getThresholdTier(healthPercentage)

    // Only trigger if we haven't already responded to this tier
    if (!repliedThresholds.has(currentTier)) {
      let message = ''
      let shouldNotify = false

      switch (currentTier) {
        case 'defeated':
          message = '💀 **CHIMERA DEFEATED!** The battle is over!'
          shouldNotify = true
          break
        case 'critical':
          message = '🚨 **CRITICAL!** Chimera is barely alive - finish it!'
          shouldNotify = true
          break
        case 'danger':
          message = '⚠️ **DANGER ZONE!** Chimera is under 10% health!'
          shouldNotify = true
          break
        case 'low':
          message = '🔥 Chimera is weakening - under 20% health!'
          shouldNotify = true
          break
        case 'medium-low':
          message = '💪 Keep pushing! Chimera under 30% health!'
          shouldNotify = true
          break
        case 'medium':
          message = '⚔️ Half way there! Chimera under 40% health!'
          shouldNotify = true
          break
        case 'medium-high':
          message = '🎯 Good progress! Chimera under 50% health!'
          shouldNotify = true
          break
        case 'high':
          message = '💥 Chimera under 60% health - keep attacking!'
          shouldNotify = true
          break
        case 'very-high':
          message = '🛡️ Chimera under 70% health!'
          shouldNotify = true
          break
        case 'near-full':
          message = '⚡ First blood! Chimera under 80% health!'
          shouldNotify = true
          break
        case 'almost-full':
          message = '🎊 Battle begins! Chimera under 90% health!'
          shouldNotify = true
          break
        default:
          shouldNotify = false
      }

      if (shouldNotify) {
        const imageBuffer = await generateImage()
        const resizedImage = await sharp(imageBuffer as Buffer)
          .resize(1920, 969)
          .jpeg({
            quality: 80,
            progressive: true,
          })
          .toBuffer()

        await interaction.followUp({
          content: message,
          files: [
            {
              attachment: Buffer.from(resizedImage as Buffer),
              contentType: 'image/jpeg',
              name: 'chimera.jpeg',
            },
          ],
        })

        repliedThresholds.add(currentTier)
      }
    }
  }, 3000)
}

const generateImage = async () => {
  const currentBossHealth = await Flashcore.get<number>('chimera:current-health')
  const maxBossHealth = await Flashcore.get<number>('chimera:max-health')

  // Calculate health percentage for visual representation
  const healthPercentage = Math.max(0, (currentBossHealth / maxBossHealth) * 100)
  const healthBarWidth = Math.max(0, healthPercentage)

  // Determine health bar color based on percentage
  let healthBarColor = '#dd7312' // Default orange
  if (healthPercentage <= 5) {
    healthBarColor = '#8b0000' // Dark red
  } else if (healthPercentage <= 10) {
    healthBarColor = '#ff0000' // Red
  } else if (healthPercentage <= 25) {
    healthBarColor = '#ff4500' // Orange red
  } else if (healthPercentage <= 50) {
    healthBarColor = '#ff8c00' // Dark orange
  }

  const warriors = (await Flashcore.get<Warrior[]>('warriors')) || []

  const leaderboard = warriors
    .map((warrior) => ({
      id: warrior.id,
      name: warrior.name,
      totalDamage: warrior.damage.reduce((acc, curr) => acc + curr.damage, 0),
    }))
    .sort((a, b) => b.totalDamage - a.totalDamage)

  return await nodeHtmlToImage({
    html: `
      <html>
     <style> 
     @font-face {
  font-family: 'Rowdies';
  src: url('{{{font}}}') format('truetype');
}
body {
  width: 1920px;
  height: 969px;
  background-color: #000;
  font-family: 'Rowdies';
}
scene {
  width: 1920px;
  height: 969px;
  position: relative;
}
.background {
  width: 1920px;
  height: 969px;
  object-fit: cover;
}
.leaderboard {
  width: 550px;
  height: 600px;
  position: absolute;
  top: 50px;
  left: 1315px;
  padding-top: 110px;
}
.leaderboard-item {
  display: grid;
  grid-template-columns: 50px 1fr 140px;
  align-items: center;
  gap: 28px;
  padding: 8px 32px 8px 14px;
}
.leaderboard-item-rank {
  font-size: 24px;
  font-weight: 400;
  color: rgb(158, 111, 93);
  text-align: right;
}
.leaderboard-item-name {
  font-size: 32px;
  font-weight: 400;
  color: #69473b;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.leaderboard-item-score {
  font-size: 32px;
  font-weight: 400;
  color: #dd7312;
  text-align: right;
}
.chimera-healthbar {
  width: 575px;
  height: 32px;
  background-color: #461e0d;
  position: absolute;
  top: 105px;
  left: 483px;
  outline: 8px solid #7d3013;
  border-radius: 12px;
}
.chimera-healthbar-inner {
  width: {{{healthBarWidth}}}%;
  height: 100%;
  background-color: #dd7312;
  border-radius: 12px;
  position: relative;
}
.chimera-healthbar-text {
  font-size: 36px;
  color: #fff;
  position: absolute;
  top: -10px;
  width: 100%;
  text-align: center;
}
.axies {
  position: absolute;
  top: 0;
  left: 0;
  width: 1920px;
  height: 969px;
}
.axie {
}
.axie-image {
  width: 100%;
  height: 100%;
}
.player-name {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  font-size: 24px;
  background-color: #000;
  border-radius: 20px;
  color: #fff;
  max-width: 150px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.right {
  transform: scaleX(-1);
}
.left {
  transform: scaleX(1);
}

     </style> 
        <body>
          <section class="scene">
      <img src={{{imageSource}}} class="background" />

      <div class="axies">
        ${leaderboard
          .slice(0, 10)
          .map(
            (warrior, index) => `
          <div class="axie"  
          style="
            position: absolute;
            z-index: ${index + 1};
            left: ${positions[index].x}px; 
            top: ${positions[index].y}px; 
            width: ${positions[index].width}px; 
            height: ${positions[index].height}px;
          
            ">
              <img src="${axieDataURI[hashCode(warrior.id) % axieDataURI.length]}" class="axie-image" style="transform: scaleX(${
              positions[index].direction
            })" />
              <span class="player-name">${warrior.name}</span>
        </div>
        `,
          )
          .join('')}
      </div>


<div class="leaderboard">
${leaderboard
  .slice(0, 10)
  .map(
    (warrior, index) => `
  <div class="leaderboard-item">
  <div class="leaderboard-item-rank">#${index + 1}</div>
  <div class="leaderboard-item-name">${warrior.name}</div>
  <div class="leaderboard-item-score">${abbreviateNumber(warrior.totalDamage, 2)}</div>
  </div>
  `,
  )
  .join('')}
</div>

      <div class="chimera-healthbar">
        <div class="chimera-healthbar-inner">
          
        </div>
        <div class="chimera-healthbar-text">{{{currentBossHealth}}} / {{{currentBossMaxHealth}}}</div>
      </div>

      
    </section>
        </body>
      </html>`,
    content: {
      imageSource: dataURI,
      font,
      currentBossHealth: abbreviateNumber(currentBossHealth, 2),
      currentBossMaxHealth: abbreviateNumber(maxBossHealth, 2),

      healthBarColor,
      healthBarWidth,
    },
  })
}
