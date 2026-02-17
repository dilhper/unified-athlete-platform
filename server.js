import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocket } from './lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true)
    handle(req, res, parsedUrl)
  })

  // Initialize Socket.io
  initializeSocket(httpServer)

  const port = process.env.PORT || 3000
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})
