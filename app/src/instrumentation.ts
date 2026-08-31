let maintenanceStarted = false

export async function register() {
  if (maintenanceStarted) return
  maintenanceStarted = true

  const { cancelExpiredOrders } = await import('./lib/db')
  const cancelExpired = () => {
    const minutes = Number(process.env.ORDER_AUTO_CANCEL_MINUTES ?? 30)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    try {
      cancelExpiredOrders(minutes)
    } catch (error) {
      console.error('background cancel expired orders failed', error)
    }
  }

  setTimeout(cancelExpired, 1_000)
  setInterval(cancelExpired, 60_000).unref()
}
