import * as stability from '../../src/monitors/stability'
import EventEmitter from '../../src/events/EventEmitter'

const ping = stability.ping
const StabilityMonitor = stability.default

global.clearInterval = jest.fn()
global.setInterval = jest.fn()

describe('Stability Monitor', () => {
    describe('ping', () => {
        it('returns true on fetch success', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ status: 200 }))
            const result = await ping('TEST')

            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(result).toBe(true)
        })

        it('returns false on non 200 status', async () => {
            global.fetch = jest.fn(() => Promise.resolve({ status: 304 }))
            const result = await ping('TEST')

            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(result).toBe(false)
        })

        it('returns false on fetch error', async () => {
            global.fetch = jest.fn().mockImplementation(() => Promise.reject())
            const result = await ping('TEST')

            expect(global.fetch).toHaveBeenCalledTimes(1)
            expect(result).toBe(false)
        })
    })

    describe('monitor', () => {
        const createMonitor = () =>
            new StabilityMonitor(new EventEmitter(), {
                resource: 'URL',
                interval: 5000,
                requestThreshold: 2000,
                durationThreshold: 2,
            })

        describe('constructor', () => {
            it('init with the correct props and calls initialize method', () => {
                const prev = StabilityMonitor.prototype.initialize
                StabilityMonitor.prototype.initialize = jest.fn()

                const monitor = createMonitor()
                expect(monitor).toMatchSnapshot()
                expect(StabilityMonitor.prototype.initialize).toHaveBeenCalled()

                StabilityMonitor.prototype.initialize = prev
            })
        })

        describe('clearCurrentInterval', () => {
            it('does not clear interval if not set', () => {
                const monitor = createMonitor()
                monitor.clearCurrentInterval()

                expect(global.clearInterval).not.toHaveBeenCalled()
            })

            it('clears interval if set', () => {
                const monitor = createMonitor()
                monitor.runInterval = 1
                monitor.clearCurrentInterval()

                expect(global.clearInterval).toHaveBeenCalled()
                expect(monitor.runInterval).toBeNull()
            })
        })

        describe('initialize', () => {
            it('sets default properties and runs monitor', () => {
                const prev = StabilityMonitor.prototype.clearCurrentInterval
                StabilityMonitor.prototype.clearCurrentInterval = jest.fn()

                const monitor = createMonitor()
                expect(monitor.consecutiveSlowRequestCount).toBe(0)
                expect(monitor.paused).toBe(false)
                expect(monitor.runInterval).toBeUndefined()
                expect(
                    StabilityMonitor.prototype.clearCurrentInterval,
                ).toHaveBeenCalled()

                StabilityMonitor.prototype.clearCurrentInterval = prev
            })
        })

        describe('pause', () => {
            it('sets paused to true', () => {
                const prev = StabilityMonitor.prototype.clearCurrentInterval
                StabilityMonitor.prototype.clearCurrentInterval = jest.fn()

                const monitor = createMonitor()
                monitor.pause()
                expect(monitor.paused).toBe(true)
                expect(
                    StabilityMonitor.prototype.clearCurrentInterval,
                ).toHaveBeenCalled()

                StabilityMonitor.prototype.clearCurrentInterval = prev
            })
        })

        describe('resume', () => {
            it('re-initializes monitor', () => {
                const prev = StabilityMonitor.prototype.initialize
                StabilityMonitor.prototype.initialize = jest.fn()

                const monitor = createMonitor()
                monitor.resume()
                expect(StabilityMonitor.prototype.initialize).toHaveBeenCalled()

                StabilityMonitor.prototype.initialize = prev
            })
        })

        describe('run', () => {
            it('returns if monitor paused', async () => {
                const pingSpy = jest
                    .spyOn(stability, 'ping')
                    .mockImplementation(() => false)

                const monitor = createMonitor()
                monitor.pause()
                await monitor.run()

                expect(pingSpy).not.toHaveBeenCalled()
            })

            it('pings the provided resource', async () => {
                const pingSpy = jest
                    .spyOn(stability, 'ping')
                    .mockImplementation(() => false)

                const monitor = createMonitor()
                await monitor.run()

                expect(pingSpy).toHaveBeenCalledTimes(1)
                expect(pingSpy).toHaveBeenLastCalledWith('URL')
            })
        })
    })
})
