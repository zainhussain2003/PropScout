import Fastify from 'fastify'
import routes from './devHpi'
import { readDevHpi } from '../services/devHpiService'

jest.mock('../services/devHpiService', () => ({
  devHpiEnabled: (): boolean =>
    process.env.NODE_ENV === 'development' && process.env.DEV_HPI_BENCHMARKS === 'true',
  readDevHpi: jest.fn(),
}))
const read = jest.mocked(readDevHpi)
const environment = { ...process.env }

afterEach(() => {
  process.env = { ...environment }
  jest.clearAllMocks()
})

test.each(['production', 'test', 'development'])('flag defaults off in %s', async (nodeEnv) => {
  process.env.NODE_ENV = nodeEnv
  delete process.env.DEV_HPI_BENCHMARKS
  const app = Fastify()
  await app.register(routes)
  expect((await app.inject('/benchmarks')).statusCode).toBe(404)
  expect(read).not.toHaveBeenCalled()
  await app.close()
})

test('production refuses an enabled flag', async () => {
  process.env.NODE_ENV = 'production'
  process.env.DEV_HPI_BENCHMARKS = 'true'
  const app = Fastify()
  await app.register(routes)
  expect((await app.inject('/benchmarks')).statusCode).toBe(404)
  await app.close()
})

test('only loopback requests with local host and origin can read values', async () => {
  process.env.NODE_ENV = 'development'
  process.env.DEV_HPI_BENCHMARKS = 'true'
  read.mockResolvedValue({ choices: [], benchmark: null })
  const app = Fastify()
  await app.register(routes)
  for (const input of [
    { remoteAddress: '198.51.100.1', headers: { host: 'localhost' } },
    { remoteAddress: '127.0.0.1', headers: { host: 'shared-preview.example' } },
    {
      remoteAddress: '127.0.0.1',
      headers: { host: 'localhost', origin: 'https://public.example' },
    },
  ]) {
    expect((await app.inject({ url: '/benchmarks', ...input })).statusCode).toBe(404)
  }
  expect(read).not.toHaveBeenCalled()
  const response = await app.inject({
    url: '/benchmarks?market=Synthetic%20Harbour&housingType=Apartment&month=2030-01',
    remoteAddress: '127.0.0.1',
    headers: { host: 'localhost:3001', origin: 'http://localhost:5173' },
  })
  expect(response.statusCode).toBe(200)
  expect(response.headers['cache-control']).toBe('no-store')
  expect(read).toHaveBeenCalledWith({
    market: 'Synthetic Harbour',
    housingType: 'Apartment',
    month: '2030-01',
  })
  expect((await app.inject({ url: '/benchmarks?month=2030-13' })).statusCode).toBe(400)
  read.mockRejectedValue(new Error('private source detail'))
  const failed = await app.inject({
    url: '/benchmarks',
    remoteAddress: '127.0.0.1',
    headers: { host: 'localhost' },
  })
  expect(failed.statusCode).toBe(503)
  expect(failed.body).not.toContain('private source detail')
  await app.close()
})
