const express = require('express')
const AuthService = require('./auth-service')
const { requireAuth } = require('../middleware/jwt-auth')

const authRouter = express.Router()
const jsonBodyParser = express.json()

authRouter.route('/login').post(jsonBodyParser, (req, res, next) => {
  // get data from request body
  const { user_name, password } = req.body
  const loginUser = { user_name, password }
  // parse data from req.body, make sure values are present
  for (const [key, value] of Object.entries(loginUser)) {
    if (value == null)
      return res.status(400).json({
        error: {
          message: `Missing '${key}' in request body`,
        },
      })
  }

  // check user_name is associated with user
  AuthService.getUserWithUserName(req.app.get('db'), loginUser.user_name)
    .then((dbUser) => {
      if (!dbUser)
        return res.status(400).json({
          error: {
            message: 'Incorrect username or password',
          },
        })
      // check that password for user is a match
      return AuthService.comparePasswords(
        loginUser.password,
        dbUser.password
      ).then((compareMatch) => {
        if (!compareMatch)
          return res.status(400).json({
            error: {
              message: 'Incorrect username or password',
            },
          })
        // if user_name and password are correct, send user_name as subject and password as payload. Return json web token with response
        const sub = dbUser.user_name
        const payload = { user_id: dbUser.id }
        res.send({
          authToken: AuthService.createJwt(sub, payload),
        })
      })
    })
    .catch(next)
})

authRouter.route('/refresh').post(requireAuth, (req, res) => {
  const sub = req.user.user_name
  const payload = { user_id: req.user_id }

  res.send({
    authToken: AuthService.createJwt(sub, payload),
  })
})

module.exports = authRouter
