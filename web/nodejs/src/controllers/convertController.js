import { convertContentToTiptapJson } from '../services/convertService.js'

export async function convert(ctx) {
  const { content } = ctx.request.body || {}

  if (!content || typeof content !== 'string') {
    ctx.status = 400
    ctx.body = { error: 'content 必须为非空字符串' }
    return
  }

  try {
    const json = await convertContentToTiptapJson(content)
    ctx.body = { ok: true, data: json }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      error: '转换失败',
      message: error?.message || String(error),
    }
  }
}

export default { convert }

