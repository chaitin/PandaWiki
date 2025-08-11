import { Editor } from '@tiptap/core'
import { getGetExtensionFn } from '../libs/tiptapLoader.js'

export async function convertContentToTiptapJson(content) {
  const getExtensionFn = await getGetExtensionFn()
  const extensions = typeof getExtensionFn === 'function' ? getExtensionFn({}) : []
  const editor = new Editor({ extensions, content })
  return editor.getJSON()
}

export default { convertContentToTiptapJson }

