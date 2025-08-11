let cachedGetExtensionFn = null
let attempted = false

async function loadExtensionFromEsm() {
  const mod = await import('@yu-cq/tiptap')
  return mod.getExtension || (mod.default && mod.default.getExtension) || null
}

async function loadExtensionFromCjs() {
  const cjs = (await import('@yu-cq/tiptap/dist/index.js')).default
  return cjs && cjs.getExtension ? cjs.getExtension : null
}

export async function getGetExtensionFn() {
  if (attempted) return cachedGetExtensionFn
  attempted = true
  try {
    cachedGetExtensionFn = await loadExtensionFromEsm()
    if (cachedGetExtensionFn) return cachedGetExtensionFn
  } catch (_) { }
  try {
    cachedGetExtensionFn = await loadExtensionFromCjs()
  } catch (_) { }
  return cachedGetExtensionFn
}

export function resetTiptapCacheForTest() {
  attempted = false
  cachedGetExtensionFn = null
}

export default { getGetExtensionFn, resetTiptapCacheForTest }

