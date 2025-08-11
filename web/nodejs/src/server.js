import { createApp } from './app.js'
import { PORT } from './config/env.js'

const app = createApp()

app.listen(PORT, () => {
  console.log(`tiptap-api 运行于 http://localhost:${PORT}`)
})

export default app

