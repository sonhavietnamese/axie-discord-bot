import type { ChatInputCommandInteraction } from 'discord.js'
import { ButtonStyle, ComponentType, MessageFlags } from 'discord.js'
import fs from 'fs'
import nodeHtmlToImage from 'node-html-to-image'
import path from 'path'
import { createCommandConfig } from 'robo.js'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { RODS } from '../../configs/rods'
import { font, storeBackgroundBase64 } from '../../core/preload'
import { type RodStoreIntern } from '../../schema'
import { getCandyBalance } from '../../services/drip'
import { getCurrentRodStoreIntern } from '../../services/rod-store'

export const config = createCommandConfig({
  description: 'Enter Rod Store',
  integrationTypes: ['GuildInstall'],
} as const)

export default async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const intern = await getCurrentRodStoreIntern()

  if (!intern) {
    return interaction.editReply({
      content: 'No store intern found',
    })
  }

  const thumbnail = await generateRodStoreImage(intern)
  const candyBalance = await getCandyBalance(interaction.user.id)

  const buttonGroup = [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: `Buy Branch Rod`,
      emoji: RODS[0].emoji,
      customId: 'buy-rod-branch',
      disabled: candyBalance <= RODS[0].price,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: `Buy Mavis Rod`,
      emoji: RODS[1].emoji,
      customId: 'buy-rod-mavis',
      disabled: candyBalance <= RODS[1].price,
    },
    {
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: `Buy BALD Rod`,
      emoji: RODS[2].emoji,
      customId: 'buy-rod-bald',
      disabled: candyBalance <= RODS[2].price,
    },
  ]

  await interaction.editReply({
    embeds: [
      {
        color: 0xfff7d9,
        title: `Rod Store`,
        description: `Welcome to the Rod Store!`,
      },
      {
        color: 0xfff7d9,
        title: `Your Candy Balance`,
        description: `You have ${await getCandyBalance(interaction.user.id)} 🍬 candies`,
      },
    ],
    files: [
      {
        name: `store-rod-${intern.userId}.png`,
        contentType: 'image/png',
        attachment: thumbnail,
      },
    ],
    components: [
      {
        type: ComponentType.ActionRow,
        components: buttonGroup,
      },
    ],
  })
}

async function generateRodStoreImage(intern: RodStoreIntern): Promise<Buffer> {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // check if file exists
  const filePath = path.join(__dirname, '..', '..', 'assets', `store-rod-${intern.userId}.png`)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath)
  }

  const image = await nodeHtmlToImage({
    html: `<html>
<style>
  @font-face {
    font-family: 'Rowdies';
    src: url('{{{font}}}') format('truetype');
  }
  body {
    width: 1310px;
    height: 1080px;
    background-color: #ffffff;
    font-family: 'Rowdies';
    position: relative;
  }

  .background-container {
    width: 1310px;
    height: 1080px;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .background-image {
    width: 1310px;
    height: 1080px;
    object-fit: cover;
  }

  .text-container {
    position: absolute;
    top: 118px;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 3;
    color: #FAE6C6;
    font-size: 20px;
  }
</style>
<body>
  <div class="background-container">
    <img src="{{{background}}}" class="background-image" />
  </div>

  <div class="text-container">
    <h1 class="text">{{storeName}}'s</h1>
  </div>
</body>
</html>`,
    content: {
      font,
      background: storeBackgroundBase64,
      storeName: String(intern.serverNickname || intern.userName).slice(0, 20),
    },
    quality: 100,
    type: 'png',
  })

  const computedImage = await sharp(image as Buffer)
    .resize(1310, 1080)
    .jpeg({
      quality: 80,
      progressive: true,
    })
    .toBuffer()

  // save image to file
  fs.writeFileSync(filePath, computedImage)

  return computedImage
}
