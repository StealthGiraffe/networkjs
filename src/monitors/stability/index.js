import { NetworkStatus } from '../../constants'
import { StabilityDefaults } from './Stability.constants'

export const ping = async resource => {
    try {
        const res = await fetch(resource)
        return res.status === 200
    } catch (e) {
        return false
    }
}

class StabilityMonitor {
    constructor(
        emitter,
        {
            resource,
            interval = StabilityDefaults.INTERVAL,
            requestThreshold = StabilityDefaults.REQUEST_THRESHOLD,
            durationThreshold = StabilityDefaults.DURATION_THRESHOLD,
        },
    ) {
        this.emitter = emitter
        this.resource = resource
        this.interval = interval
        this.requestThreshold = requestThreshold
        this.durationThreshold = durationThreshold

        this.initialize()
    }

    clearCurrentInterval() {
        if (this.runInterval) {
            clearInterval(this.runInterval)
            this.runInterval = null
        }
    }

    initialize() {
        this.consecutiveSlowRequestCount = 0
        this.paused = false
        this.clearCurrentInterval()
        this.runInterval = setInterval(this.run.bind(this), this.interval)
    }

    pause() {
        this.paused = true
        this.clearCurrentInterval()
    }

    resume() {
        this.initialize()
    }

    async run() {
        if (this.paused) return

        const start = window.performance.now()
        if (await ping(this.resource)) {
            if (window.performance.now() - start > this.durationThreshold) {
                this.consecutiveSlowRequestCount++
                if (
                    this.consecutiveSlowRequestCount ===
                        this.requestThreshold &&
                    !this.paused
                ) {
                    this.emitter.dispatchEvent(NetworkStatus.UNSTABLE)
                }
            } else {
                if (
                    this.consecutiveSlowRequestCount >= this.requestThreshold &&
                    !this.paused
                ) {
                    this.emitter.dispatchEvent(NetworkStatus.STABLE)
                }
                this.consecutiveSlowRequestCount = 0
            }
        }
    }
}

export default StabilityMonitor
