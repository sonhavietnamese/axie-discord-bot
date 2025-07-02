import type { Interaction } from 'discord.js'
import nodeHtmlToImage from 'node-html-to-image'
import sharp from 'sharp'

import { axiesImages, backgroundsImages, font } from '../core/preload'

// Axie metadata – keep it in sync with the command definition
const axies = [
  { id: '001', name: 'Krio' },
  { id: '002', name: 'Machito' },
  { id: '003', name: 'Olek' },
  { id: '004', name: 'Puff' },
  { id: '005', name: 'Buba' },
  { id: '006', name: 'Hope' },
  { id: '007', name: 'Rouge' },
  { id: '008', name: 'Noir' },
  { id: '009', name: 'Ena' },
  { id: '010', name: 'Xia' },
  { id: '011', name: 'Tripp' },
  { id: '012', name: 'Momo' },
]

export default async (interaction: Interaction) => {
  if (!interaction.isStringSelectMenu()) return

  // Only handle the select menu from our command
  if (interaction.customId !== 'axie_select') return

  const selectedId = interaction.values[0]
  const axie = axies.find((a) => a.id === selectedId)

  if (!axie) {
    await interaction.reply({ content: '❌ Unknown Axie selected.', ephemeral: true })
    return
  }

  // Acknowledge the interaction early to avoid the 3-second timeout
  await interaction.deferReply({ ephemeral: true })

  // Generate the reveal image
  const image = await nodeHtmlToImage({
    html: `
      <html>
     <style> 
      @font-face {
        font-family: 'Rowdies';
        src: url('{{{font}}}') format('truetype');
      }
      body {
        width: 1920px;
        height: 1350px;
        background-color: #ffffff;
        font-family: 'Rowdies';

      }

      .background-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
      }

      .axie-container {
        width: 875px;
        height: 875px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -35%);
        z-index: 2;
      }

      .axie-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .axie-mask {
        width: 875px;
        height: 875px;
        background-color: #603E1C;
        position: absolute;
        top: 273px;
        left: 523px;
        -webkit-mask: url('{{{mask}}}') no-repeat center;
        mask: url('{{{mask}}}') no-repeat center;
        -webkit-mask-size: contain;
        mask-size: contain;
      }


      </style> 
        <body>
          <div class="background-container"> 
            <img src="{{{background}}}" class="background-image" />
          </div>
          <div class="axie-container"> 
            <div class="axie-mask"></div>
          </div>
        </body>
      </html>`,
    content: {
      font,
      mask: axiesImages[selectedId],
      background: backgroundsImages['question'],
    },
  })

  const resizedImage = await sharp(image as Buffer)
    .resize(1920, 1350)
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer()

  await interaction.editReply({
    content: `🎉 You revealed **${axie.name}**!`,
    files: [
      {
        attachment: resizedImage,
        name: `axie-${selectedId}.jpeg`,
        contentType: 'image/jpeg',
      },
    ],
  })
}
