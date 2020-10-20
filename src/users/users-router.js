const express = require('express')
const path = require('path')
const UsersService = require('./users-service')

const usersRouter = express.Router()
const jsonBodyParser = express.json()

usersRouter.route('/').post(jsonBodyParser, (req, res, next) => {
  const { email, user_name, password } = req.body

  // check that request has all required fields
  for (const field of ['email', 'user_name', 'password']) {
    if (!req.body[field]) {
      return res.status(400).json({
        error: {
          message: `Missing '${field}' in request body`,
        },
      })
    }
  }

  // check that password is valid, return error if not
  const passwordError = UsersService.validatePassword(password)
  if (passwordError) {
    return res.status(400).json({
      error: {
        message: passwordError,
      },
    })
  }

  // check that email is valid, return error if not
  const emailError = UsersService.validateEmail(email)
  if (emailError) {
    return res.status(400).json({
      error: {
        message: emailError,
      },
    })
  }

  // check that user is new, return error if not
  UsersService.hasUserWithUserName(req.app.get('db'), user_name)
    .then((hasUserWithUserName) => {
      if (hasUserWithUserName) {
        return res.status(400).json({
          error: {
            message: `Username already taken`,
          },
        })
      }

      // check that email is new, return error if not
      return UsersService.hasUserWithEmail(req.app.get('db'), email).then(
        (hasUserWithEmail) => {
          if (hasUserWithEmail) {
            return res.status(400).json({
              error: {
                message: 'A user is already registered with this email address',
              },
            })
          }

          const newUser = {
            user_name,
            password,
            email,
            date_created: 'now()',
          }
          // create user in database, return new user
          return UsersService.insertUser(req.app.get('db'), newUser).then(
            (user) => {
              res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${user.id}`))
                .json(UsersService.serializeUser(user))
            }
          )
        }
      )
    })
    .catch(next)
})

module.exports = usersRouter
