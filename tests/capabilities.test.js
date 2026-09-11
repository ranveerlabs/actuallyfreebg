import test from 'node:test'
import assert from 'node:assert/strict'
import { selectDevice } from '../capabilities.js'

test('missing and rejected adapters use WASM', async () => {
  assert.equal(await selectDevice(undefined), 'cpu')
  assert.equal(await selectDevice({ requestAdapter: async () => null }), 'cpu')
  assert.equal(await selectDevice({ requestAdapter: async () => { throw new Error('blocked') } }), 'cpu')
})

test('desktop requires float16 and a working device', async () => {
  const adapter = { features: new Set(), requestDevice: async () => { throw new Error('unsupported') } }
  const gpu = { requestAdapter: async () => adapter }
  assert.equal(await selectDevice(gpu), 'cpu')
  adapter.features.add('shader-f16')
  assert.equal(await selectDevice(gpu), 'cpu')
})

test('a successful probe releases its device', async () => {
  let destroyed = false
  let requested
  const gpu = { requestAdapter: async () => ({
    features: new Set(['shader-f16']),
    requestDevice: async options => {
      requested = options.requiredFeatures
      return { destroy: () => { destroyed = true } }
    }
  }) }
  assert.equal(await selectDevice(gpu), 'gpu')
  assert.deepEqual(requested, ['shader-f16'])
  assert.equal(destroyed, true)
  assert.equal(await selectDevice(gpu, true), 'gpu')
  assert.deepEqual(requested, [])
})

test('a hung GPU probe does not block WASM', async () => {
  const gpu = { requestAdapter: () => new Promise(() => {}) }
  assert.equal(await selectDevice(gpu), 'cpu')
})
