import Router from '@koa/router'
import { convert } from '../controllers/convertController.js'
import { health } from '../controllers/healthController.js'

const router = new Router()

router.post('/convert', convert)
router.get('/health', health)

export default router

