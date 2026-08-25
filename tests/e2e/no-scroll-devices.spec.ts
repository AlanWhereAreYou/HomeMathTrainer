import { expect, test } from '@playwright/test'

type DeviceCase = {
  name: string
  width: number
  height: number
}

const devices: DeviceCase[] = [
  { name: 'iPhone 14 portrait', width: 390, height: 844 },
  { name: 'Pixel 7 portrait', width: 412, height: 915 },
  { name: 'iPad portrait', width: 820, height: 1180 },
]

async function mockStartSession(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/session/start', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'e2e-session',
        streak: 0,
        targetStreak: 20,
        passed: false,
        question: {
          id: 'q-1',
          expression: '(-12) + (7)',
        },
      }),
    })
  })
}

for (const device of devices) {
  test(`no vertical scrolling required on ${device.name}`, async ({ page }) => {
    await page.setViewportSize({ width: device.width, height: device.height })
    await mockStartSession(page)
    await page.goto('/')

    await expect(page.locator('.card')).toBeVisible()

    const pageMetrics = await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement
      return {
        scrollHeight: root.scrollHeight,
        clientHeight: root.clientHeight,
      }
    })

    expect(pageMetrics.scrollHeight).toBeLessThanOrEqual(pageMetrics.clientHeight + 1)

    const cardMetrics = await page.locator('.card').evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }))

    expect(cardMetrics.scrollHeight).toBeLessThanOrEqual(cardMetrics.clientHeight + 1)
  })
}
