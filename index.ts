import * as express from 'express'
import * as morgan from 'morgan'
import * as bodyParser from 'body-parser'
import * as minimist from 'minimist'

const args = minimist(process.argv.slice(2)) 
const port = parseInt(args.port) || 8080

const app = express()

app.use(express.static('public'))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader("Access-Control-Allow-Methods", "POST, GET")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
  next()
})


app.post('/', bodyParser.json(), function (req, res) {
  console.log(req.body)
  res.send({})
  res.end()
})


app.listen(port, () => console.log(`started on port ${port}`))