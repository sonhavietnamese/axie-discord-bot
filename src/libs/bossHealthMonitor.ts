import { Colors, type TextChannel, type ChatInputCommandInteraction, type Message } from 'discord.js'
import fs from 'fs'
import font2base64 from 'node-font2base64'
import nodeHtmlToImage from 'node-html-to-image'
import path from 'path'
import { Flashcore, logger } from 'robo.js'
import { fileURLToPath } from 'url'
import { abbreviateNumber } from './utils'
import { CHIMERA_MAX_HEALTH, axies, positions } from '../constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HEALTH_THRESHOLDS = [75, 50, 25, 10, 5, 0]
const UPDATE_INTERVAL = 3000 // 3 seconds

export interface HealthThresholdEvent {
  threshold: number
  currentHealth: number
  maxHealth: number
  percentage: number
}

export class BossHealthMonitor {
  private static triggeredThresholds = new Set<number>()
  private static monitoringInterval: NodeJS.Timeout | null = null
  private static isMonitoring = false
  private static monitoringChannel: ChatInputCommandInteraction | null = null

  static async checkHealthThresholds(
    previousHealth: number,
    currentHealth: number,
    maxHealth: number,
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    const previousPercentage = (previousHealth / maxHealth) * 100
    const currentPercentage = (currentHealth / maxHealth) * 100

    // Check each threshold
    for (const threshold of HEALTH_THRESHOLDS) {
      // If we crossed this threshold and haven't triggered it yet
      if (previousPercentage > threshold && currentPercentage <= threshold && !this.triggeredThresholds.has(threshold)) {
        this.triggeredThresholds.add(threshold)
        await this.triggerThresholdEvent(
          {
            threshold,
            currentHealth,
            maxHealth,
            percentage: currentPercentage,
          },
          interaction,
        )
      }
    }

    // Update live status message after threshold check (only if monitoring is active and we have a channel)
    if (this.isMonitoring && this.monitoringChannel) {
      await this.updateLiveStatusDirect(currentHealth, maxHealth)
    }
  }

  static async startAutoMonitoring(interaction: ChatInputCommandInteraction): Promise<Message | null> {
    // Stop any existing monitoring
    this.stopAutoMonitoring()

    try {
      // Store the channel for direct updates (avoids interaction expiry)
      // if (interaction.channel && interaction.channel.isTextBased()) {
      //   this.monitoringChannel = interaction.channel as TextChannel
      // } else {
      //   return null
      // }

      this.monitoringChannel = interaction

      // Create initial live status message
      const liveStatusMessage = await this.createLiveStatusMessage(interaction)
      console.log(liveStatusMessage)

      if (liveStatusMessage) {
        // Start monitoring interval - no need to store message info anymore
        this.isMonitoring = true
        this.monitoringInterval = setInterval(async () => {
          await this.performLiveUpdate()
        }, UPDATE_INTERVAL)

        logger.info('Auto health monitoring started')
        return liveStatusMessage
      }
    } catch (error) {
      logger.error('Failed to start auto monitoring:', error)
    }

    return null
  }

  static stopAutoMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    this.monitoringChannel = null
    logger.info('Auto health monitoring stopped')
  }

  private static async createLiveStatusMessage(interaction: ChatInputCommandInteraction): Promise<Message | null> {
    // console.log(interaction)
    // if (!interaction.channel || !interaction.channel.isTextBased()) {
    //   return null
    // }

    const currentHealth = await Flashcore.get<number>('chimera:current-health')
    const maxHealth = await Flashcore.get<number>('chimera:max-health')

    if (!maxHealth || maxHealth <= 0) {
      return null
    }

    const imageBuffer = await this.generateBossImage(currentHealth, maxHealth)
    const healthPercentage = (currentHealth / maxHealth) * 100
    const { statusColor, statusText } = this.getHealthStatus(currentHealth, maxHealth)

    try {
      const message = await interaction.followUp({
        content: '📊 **LIVE CHIMERA STATUS** 📊\n*Status updates will be posted every 3 seconds*',
        embeds: [
          {
            color: statusColor,
            title: `🐲 Chimera Status: ${statusText}`,
            description: `Health: ${abbreviateNumber(currentHealth, 2)} / ${abbreviateNumber(maxHealth, 2)} (${healthPercentage.toFixed(1)}%)`,
            fields: [
              {
                name: '❤️ Health',
                value: `${healthPercentage.toFixed(1)}%`,
                inline: true,
              },
              {
                name: '⚔️ Status',
                value: statusText,
                inline: true,
              },
              {
                name: '🕒 Initial Status',
                value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: {
              text: 'Use /hit chimera to attack! • Auto-updates every 3s',
            },
          },
        ],
        files: [
          {
            attachment: Buffer.from(imageBuffer as Buffer),
            contentType: 'image/png',
            name: 'chimera-live-status.png',
          },
        ],
      })

      // Try to pin the message for visibility
      try {
        await message.pin()
      } catch (pinError) {
        logger.warn('Could not pin live status message:', pinError)
      }

      return message
    } catch (error) {
      logger.error('Failed to create live status message:', error)
      return null
    }
  }

  private static async updateLiveStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.isMonitoring) return

    try {
      const currentHealth = await Flashcore.get<number>('chimera:current-health')
      const maxHealth = await Flashcore.get<number>('chimera:max-health')

      if (!maxHealth || maxHealth <= 0) {
        this.stopAutoMonitoring()
        return
      }

      const imageBuffer = await this.generateBossImage(currentHealth, maxHealth)
      const healthPercentage = (currentHealth / maxHealth) * 100
      const { statusColor, statusText } = this.getHealthStatus(currentHealth, maxHealth)

      await interaction.followUp({
        content: '📊 **LIVE CHIMERA STATUS UPDATE** 📊',
        embeds: [
          {
            color: statusColor,
            title: `🐲 Chimera Status: ${statusText}`,
            description: `Health: ${abbreviateNumber(currentHealth, 2)} / ${abbreviateNumber(maxHealth, 2)} (${healthPercentage.toFixed(1)}%)`,
            fields: [
              {
                name: '❤️ Health',
                value: `${healthPercentage.toFixed(1)}%`,
                inline: true,
              },
              {
                name: '⚔️ Status',
                value: statusText,
                inline: true,
              },
              {
                name: '🕒 Update Time',
                value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: {
              text: 'Use /hit chimera to attack! • Auto-updates every 3s',
            },
          },
        ],
        files: [
          {
            attachment: Buffer.from(imageBuffer as Buffer),
            contentType: 'image/png',
            name: 'chimera-live-status.png',
          },
        ],
      })

      // If boss is dead, stop monitoring
      if (currentHealth <= 0) {
        this.stopAutoMonitoring()
        // Add a final victory message
        await interaction.followUp({
          content: '🎉 **MONITORING COMPLETE** 🎉\nThe Chimera has been defeated! Auto-monitoring has stopped.',
          embeds: [
            {
              color: 0xffd700, // Gold
              title: '👑 Victory Achieved!',
              description: 'The mighty Chimera has fallen! Warriors may rest until a new challenge arises.',
            },
          ],
        })
      }
    } catch (error) {
      logger.error('Failed to update live status:', error)
    }
  }

  private static async updateLiveStatusDirect(currentHealth: number, maxHealth: number): Promise<void> {
    if (!this.isMonitoring || !this.monitoringChannel) return

    try {
      const imageBuffer = await this.generateBossImage(currentHealth, maxHealth)
      const healthPercentage = (currentHealth / maxHealth) * 100
      const { statusColor, statusText } = this.getHealthStatus(currentHealth, maxHealth)

      await this.monitoringChannel.followUp({
        content: '📊 **LIVE CHIMERA STATUS UPDATE** 📊',
        embeds: [
          {
            color: statusColor,
            title: `🐲 Chimera Status: ${statusText}`,
            description: `Health: ${abbreviateNumber(currentHealth, 2)} / ${abbreviateNumber(maxHealth, 2)} (${healthPercentage.toFixed(1)}%)`,
            fields: [
              {
                name: '❤️ Health',
                value: `${healthPercentage.toFixed(1)}%`,
                inline: true,
              },
              {
                name: '⚔️ Status',
                value: statusText,
                inline: true,
              },
              {
                name: '🕒 Update Time',
                value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: {
              text: 'Use /hit chimera to attack! • Auto-updates every 3s',
            },
          },
        ],
        files: [
          {
            attachment: Buffer.from(imageBuffer as Buffer),
            contentType: 'image/png',
            name: 'chimera-live-status.png',
          },
        ],
      })

      // If boss is dead, stop monitoring
      if (currentHealth <= 0) {
        this.stopAutoMonitoring()
        // Add a final victory message
        await this.monitoringChannel.followUp({
          content: '🎉 **MONITORING COMPLETE** 🎉\nThe Chimera has been defeated! Auto-monitoring has stopped.',
          embeds: [
            {
              color: 0xffd700, // Gold
              title: '👑 Victory Achieved!',
              description: 'The mighty Chimera has fallen! Warriors may rest until a new challenge arises.',
            },
          ],
        })
      }
    } catch (error) {
      logger.error('Failed to update live status directly:', error)
    }
  }

  private static async performLiveUpdate(): Promise<void> {
    if (!this.isMonitoring || !this.monitoringChannel) return

    try {
      const currentHealth = await Flashcore.get<number>('chimera:current-health')
      const maxHealth = await Flashcore.get<number>('chimera:max-health')

      if (!maxHealth || maxHealth <= 0) {
        this.stopAutoMonitoring()
        return
      }

      await this.updateLiveStatusDirect(currentHealth, maxHealth)
    } catch (error) {
      logger.error('Failed to perform live update:', error)
    }
  }

  private static getHealthStatus(currentHealth: number, maxHealth: number): { statusColor: number; statusText: string } {
    const healthPercentage = (currentHealth / maxHealth) * 100

    if (currentHealth <= 0) {
      return { statusColor: 0xffd700, statusText: 'Defeated' } // Gold
    } else if (healthPercentage <= 5) {
      return { statusColor: 0x8b0000, statusText: 'Critical' } // Dark red
    } else if (healthPercentage <= 10) {
      return { statusColor: 0xff0000, statusText: 'Near Death' } // Red
    } else if (healthPercentage <= 25) {
      return { statusColor: 0xff4500, statusText: 'Severely Wounded' } // Orange red
    } else if (healthPercentage <= 50) {
      return { statusColor: 0xffa500, statusText: 'Wounded' } // Orange
    } else if (healthPercentage <= 75) {
      return { statusColor: 0xffff00, statusText: 'Slightly Wounded' } // Yellow
    } else {
      return { statusColor: 0x00ff00, statusText: 'Healthy' } // Green
    }
  }

  private static async triggerThresholdEvent(event: HealthThresholdEvent, interaction: ChatInputCommandInteraction): Promise<void> {
    logger.info(`Boss health threshold triggered: ${event.threshold}%`)

    try {
      // Get the message and title based on threshold - no image generation here
      const { message, title, color } = this.getThresholdMessage(event.threshold, event.percentage)

      // Send the message to the channel without image
      if (interaction.channel && interaction.channel.isTextBased()) {
        await (interaction.channel as TextChannel).send({
          content: message,
          embeds: [
            {
              color,
              title,
              description: `Chimera Health: ${abbreviateNumber(event.currentHealth, 2)} / ${abbreviateNumber(
                event.maxHealth,
                2,
              )} (${event.percentage.toFixed(1)}%)`,
              fields: [
                {
                  name: '💥 Threshold Reached',
                  value: `${event.threshold}% health remaining`,
                  inline: true,
                },
                {
                  name: '⚔️ Keep Fighting!',
                  value: 'Live status updates below',
                  inline: true,
                },
              ],
            },
          ],
        })
      }
    } catch (error) {
      logger.error('Failed to send threshold event:', error)
    }
  }

  private static getThresholdMessage(threshold: number, percentage: number): { message: string; title: string; color: number } {
    switch (threshold) {
      case 75:
        return {
          message: '⚔️ The Chimera is starting to show signs of weakness!',
          title: 'Chimera Health: 75%',
          color: Colors.Yellow,
        }
      case 50:
        return {
          message: '🔥 The Chimera is badly wounded! Keep fighting!',
          title: 'Chimera Health: 50%',
          color: Colors.Orange,
        }
      case 25:
        return {
          message: '💀 The Chimera is on its last legs! Victory is near!',
          title: 'Chimera Health: 25%',
          color: Colors.Red,
        }
      case 10:
        return {
          message: '⚡ The Chimera is nearly defeated! One final push!',
          title: 'Chimera Health: 10%',
          color: Colors.DarkRed,
        }
      case 5:
        return {
          message: '🚨 CRITICAL! The Chimera is hanging by a thread!',
          title: 'Chimera Health: 5%',
          color: Colors.DarkRed,
        }
      case 0:
        return {
          message: '🎉 VICTORY! The Chimera has been defeated! Champions have emerged!',
          title: 'Chimera Defeated!',
          color: Colors.Gold,
        }
      default:
        return {
          message: `The Chimera's health has dropped to ${percentage.toFixed(1)}%`,
          title: `Chimera Health: ${percentage.toFixed(1)}%`,
          color: Colors.Blurple,
        }
    }
  }

  static async generateBossImage(currentHealth: number, maxHealth: number): Promise<Buffer> {
    const startTime = new Date()
    logger.info(`Generating boss image: ${new Date().toISOString()}`)

    // Load background image
    const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'background.jpg'))
    const base64Image = Buffer.from(image).toString('base64')
    const dataURI = 'data:image/jpeg;base64,' + base64Image

    // Load axie images
    const axieDataURI = axies.map((axie) => {
      const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'axies', `${axie}.png`))
      const base64Image = Buffer.from(image).toString('base64')
      return 'data:image/png;base64,' + base64Image
    })

    // Load font
    const font = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', 'assets', 'Rowdies-Bold.ttf'))

    // Calculate health percentage for visual representation
    const healthPercentage = Math.max(0, (currentHealth / maxHealth) * 100)
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

    logger.info(`Image generation completed in: ${new Date().getTime() - startTime.getTime()}ms`)

    return (await nodeHtmlToImage({
      html: `
        <html>
       <style> @font-face { font-family: 'Rowdies'; src: url("{{{font}}}") format('truetype'); } body { width: 1920px; height: 969px; background-color: #000; font-family: 'Rowdies'; } scene { width: 1920px; height: 969px; position: relative; } .background { width: 1920px; height: 969px; object-fit: cover; } .leaderboard { width: 550px; height: 600px; position: absolute; top: 50px; left: 1315px; padding-top: 110px; } .leaderboard-item { display: grid; grid-template-columns: 50px 1fr 140px; align-items: center; gap: 28px; padding: 8px 32px 8px 14px; } .leaderboard-item-rank { font-size: 24px; font-weight: 400; color:rgb(158, 111, 93); text-align: right; } .leaderboard-item-name { font-size: 32px; font-weight: 400; color: #69473b; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; } .leaderboard-item-score { font-size: 32px; font-weight: 400; color: #dd7312; text-align: right; } .chimera-healthbar { width: 575px; height: 32px; background-color: #461e0d; position: absolute; top: 105px; left: 483px; outline: 8px solid #7d3013; border-radius: 12px; } .chimera-healthbar-inner { height: 100%; background-color: {{{healthBarColor}}}; border-radius: 12px; position: relative; width: {{{healthBarWidth}}}%; } .chimera-healthbar-text { font-size: 36px; color: #fff; position: absolute; top: -10px; left: 40%; } .axies { position: absolute; top: 0; left: 0; width: 1920px; height: 969px; } .axie { } .axie-image { width: 100%; height: 100%; } .player-name { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; font-size: 24px; background-color: #000; border-radius: 20px; color: #fff; } .right { transform: scaleX(-1); } .left { transform: scaleX(1); } </style> 
          <body>
            <section class="scene">
        <img src={{{imageSource}}} class="background" />

        <div class="axies">
          ${Array.from({ length: 10 })
            .map(
              (axie, index) => `
            <div class="axie"  
            style="
              position: absolute;
              z-index: ${index + 1};
              left: ${positions[index].x}px; 
              top: ${positions[index].y}px; 
              width: ${positions[index].width}px; 
              height: ${positions[index].height}px;
            
              ">
                <img src="${axieDataURI[index]}" class="axie-image" style="transform: scaleX(${positions[index].direction})" />
                <span class="player-name">${axies[index]}</span>
          </div>
          `,
            )
            .join('')}
        </div>

  <div class="leaderboard">
  ${Array.from({ length: 10 })
    .map(
      (_, index) => `
    <div class="leaderboard-item">
    <div class="leaderboard-item-rank">#${index + 1}</div>
    <div class="leaderboard-item-name">Chimera</div>
    <div class="leaderboard-item-score">9,92m</div>
    </div>
    `,
    )
    .join('')}
  </div>

        <div class="chimera-healthbar">
          <div class="chimera-healthbar-inner">
            <div class="chimera-healthbar-text">{{{currentBossHealth}}} / {{{currentBossMaxHealth}}}</div>
          </div>
        </div>

        
      </section>
          </body>
        </html>`,
      content: {
        imageSource: dataURI,
        font,
        currentBossHealth: abbreviateNumber(currentHealth, 2),
        currentBossMaxHealth: abbreviateNumber(maxHealth, 2),
        healthBarColor,
        healthBarWidth,
      },
    })) as Buffer
  }

  static resetThresholds(): void {
    this.triggeredThresholds.clear()
  }

  static isMonitoringActive(): boolean {
    return this.isMonitoring
  }
}
