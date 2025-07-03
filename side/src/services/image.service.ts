import nodeHtmlToImage from 'node-html-to-image'
import sharp from 'sharp'
import { axiesImages, backgroundsImages, font } from '../core/preload'
import { gameHtmlTemplate, revealHtmlTemplate } from '../templates/game.templates'
import type { Axie } from '../schema'

export class ImageService {
  async generateGameImage(axie: Axie): Promise<Buffer> {
    const image = await nodeHtmlToImage({
      html: gameHtmlTemplate,
      content: {
        font,
        mask: axiesImages[axie.id],
        background: backgroundsImages['question'],
      },
    })

    return await sharp(image as Buffer)
      .resize(1920, 1350)
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer()
  }

  async generateRevealImage(axie: Axie): Promise<Buffer> {
    const image = await nodeHtmlToImage({
      html: revealHtmlTemplate,
      content: {
        font,
        axie: axiesImages[axie.id],
        background: backgroundsImages['reveal'],
        axieName: axie.name,
      },
    })

    return await sharp(image as Buffer)
      .resize(1920, 1350)
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer()
  }

  async generatePreviewImage(axieId: string): Promise<Buffer> {
    const image = await nodeHtmlToImage({
      html: gameHtmlTemplate,
      content: {
        font,
        mask: axiesImages[axieId],
        background: backgroundsImages['question'],
      },
    })

    return await sharp(image as Buffer)
      .resize(1920, 1350)
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer()
  }
}

export const imageService = new ImageService()
