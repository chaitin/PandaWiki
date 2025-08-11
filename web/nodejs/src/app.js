import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import router from './routes/index.js'

export function createApp() {
  const app = new Koa()
  app
    .use(bodyParser({ enableTypes: ['json', 'text'] }))
    .use(router.routes())
    .use(router.allowedMethods())
  return app
}

export default createApp

