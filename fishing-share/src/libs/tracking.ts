import { v4 as uuidv4 } from 'uuid'

export const TRACKING_ENDPOINT = 'https://x.skymavis.com/track'

type IdentityPayload = {
  id: string
  username: string
  globalName: string
}

export async function trackIdentity({ id, username, globalName }: IdentityPayload) {
  const payload = {
    events: [
      {
        type: 'identify',
        data: {
          uuid: uuidv4(),
          ref: 'ref',
          timestamp: new Date().toISOString(),
          session_id: uuidv4(),
          offset: 0,
          user_id: id,
          build_version: process.env.VERSION,
          platform_name: 'Discord',
          platform_version: '1.0.0',
          internet_type: 'wifi',
          user_properties: {
            id,
            username,
            global_name: globalName,
          },
        },
      },
    ],
  }

  const response = await fetch(TRACKING_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${process.env.RONIN_TRACKING_AUTHORIZATION}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

type EventPayload = {
  id: string
  event: string
  action: string
  action_properties: Record<string, any>
}

export async function trackEvent({ id, event, action, action_properties }: EventPayload) {
  const payload = {
    events: [
      {
        type: 'track',
        data: {
          uuid: uuidv4(),
          event,
          ref: 'ref',
          timestamp: new Date().toISOString(),
          session_id: uuidv4(),
          offset: 0,
          user_id: id,
          action,
          action_properties,
        },
      },
    ],
  }

  const response = await fetch(TRACKING_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${process.env.RONIN_TRACKING_AUTHORIZATION}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}
