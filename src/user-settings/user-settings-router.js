const express = require('express')
const path = require('path')
const UserSettingsService = require('./user-settings-service')
const { requireAuth } = require('../middleware/jwt-auth')

const userSettingsRouter = express.Router()
const jsonParser = express.json()

userSettingsRouter
  .route('/')
  // .all(requireAuth)
  .get(requireAuth, (req, res, next) => {
    UserSettingsService.getSettings(req.app.get('db'), req.user.id).then(
      (settings) => {
        res.json(settings)
      }
    )
  })
  .patch(requireAuth, jsonParser, (req, res, next) => {
    const { dark_mode } = req.body

    // check if request contain all values needed
    if (dark_mode === null || dark_mode === undefined) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'dark_mode'`,
        },
      })
    }

    // update settings
    UserSettingsService.updateSettings(req.app.get('db'), req.user.id, {
      dark_mode,
    })
      .then(() => res.status(204).end())
      .catch(next)
  })

module.exports = userSettingsRouter
