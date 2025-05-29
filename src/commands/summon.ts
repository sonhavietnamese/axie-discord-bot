import { createCommandConfig, logger } from 'robo.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import { isAdmin, require } from '../libs/utils'
import nodeHtmlToImage from 'node-html-to-image'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import font2base64 from 'node-font2base64'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const config = createCommandConfig({
  description: 'Summon the Chimera',
  contexts: ['Guild'],
  integrationTypes: ['GuildInstall', 'UserInstall'],
} as const)

const axies = ['bing', 'hope', 'buba', 'machito', 'momo', 'shillin', 'tripp', 'pomodoro', 'venoki', 'xia']

const positions = [
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

export default async (interaction: ChatInputCommandInteraction) => {
  logger.info(`Summon command used by ${interaction.user}`)
  await require(isAdmin(interaction.user.id), 'You are not authorized to start an arena', interaction)

  // Defer the reply since image generation might take some time
  await interaction.deferReply()

  // Log the time
  const startTime = new Date()
  console.log('Load assets: ', new Date().toISOString())

  // Load Image
  const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'background.jpg'))
  const base64Image = Buffer.from(image).toString('base64')
  const dataURI = 'data:image/jpeg;base64,' + base64Image

  const axieDataURI = axies.map((axie) => {
    const image = fs.readFileSync(path.join(__dirname, '..', 'assets', 'axies', `${axie}.png`))
    const base64Image = Buffer.from(image).toString('base64')
    return 'data:image/png;base64,' + base64Image
  })

  console.log('Load done! Take :', new Date().getTime() - startTime.getTime(), 'ms')

  // Load font
  const font = font2base64.encodeToDataUrlSync(path.join(__dirname, '..', 'assets', 'Rowdies-Bold.ttf'))

  const generateStartTime = new Date()
  console.log('Generate start: ', generateStartTime.toISOString())

  const imageBuffer = await nodeHtmlToImage({
    html: `
      <html>
        <style>
        @font-face {
        font-family: 'Rowdies';
        src: url("{{{font}}}") format('truetype'); // don't forget the format!
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
        color:rgb(158, 111, 93);
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
        width: 80%;
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
        left: 40%;
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
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#1</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">9,92m</div>
</div>
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#2</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">10,40m</div>
</div>
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#3</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">10,50m</div>
</div>
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#4</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">10,60m</div>
</div>
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#5</div>
  <div class="leaderboard-item-name">Laplace</div>
  <div class="leaderboard-item-score">10,70m</div>
</div>
<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#6</div>
  <div class="leaderboard-item-name">baldhime | nadarehime</div>
  <div class="leaderboard-item-score">70,70m</div>
</div>

<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#7</div>
  <div class="leaderboard-item-name">🅴🆃 ᵇᵃˡᵈ</div>
  <div class="leaderboard-item-score">10,80m</div>
</div>

<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#8</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">10,90m</div>
</div>

<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#9</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">11,00m</div>
</div>

<div class="leaderboard-item">
  <div class="leaderboard-item-rank">#10</div>
  <div class="leaderboard-item-name">Chimera</div>
  <div class="leaderboard-item-score">11,10m</div>
</div>
</div>

      <div class="chimera-healthbar">
        <div class="chimera-healthbar-inner">
          <div class="chimera-healthbar-text">1,23m / 1,23m</div>
        </div>
      </div>

      
    </section>
        </body>
      </html>`,
    content: { imageSource: dataURI, font },
  })

  console.log('Generate done! Take :', new Date().getTime() - generateStartTime.getTime(), 'ms')

  await interaction.editReply({
    content: 'Chimera summoned!',
    files: [
      {
        attachment: Buffer.from(imageBuffer as Buffer),
        contentType: 'image/png',
        name: 'chimera.png',
      },
    ],
  })
}
