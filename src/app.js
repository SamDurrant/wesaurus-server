const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')

// routes
const authRouter = require('./auth/auth-router')
const wordsRouter = require('./words/words-router')
const usersRouter = require('./users/users-router')
const definitionsRouter = require('./definitions/definitions-router')
const userWordsRouter = require('./user-words/user-words-router')
const userDefinitionsRouter = require('./user-definitions/user-definitions-router')
const userSettingsRouter = require('./user-settings/user-settings-router')

const app = express()

app.use(
  morgan(NODE_ENV === 'production' ? 'tiny' : 'common', {
    skip: () => NODE_ENV === 'test',
  })
)
app.use(cors())
app.use(helmet())

app.use('/api/auth', authRouter)
app.use('/api/words', wordsRouter)
app.use('/api/definitions', definitionsRouter)
app.use('/api/users', usersRouter)
app.use('/api/users/:user_id/words', userWordsRouter)
app.use('/api/users/:user_id/definitions', userDefinitionsRouter)
app.use('/api/users/:user_id/settings', userSettingsRouter)

app.get('/', (req, res) => {
  res.send('Hello, world!')
})
// hides error messages from users/malicious parties in prod
app.use(function errorHandler(error, req, res, next) {
  let response

  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.error(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
})

module.exports = app
