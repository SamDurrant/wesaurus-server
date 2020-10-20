const express = require('express')
const path = require('path')
const DefinitionsService = require('./definitions-service')

const definitionsRouter = express.Router()
const jsonBodyParser = express.json()

definitionsRouter
  .route('/')
  .get((req, res, next) => {
    DefinitionsService.getAllDefinitions(req.app.get('db'))
      .then((defs) => {
        res.json(defs.map(DefinitionsService.serializeDefinition))
      })
      .catch(next)
  })
  .post(jsonBodyParser, (req, res, next) => {
    const { user_id, word_id, text } = req.body
    const newDefinition = { user_id, word_id, text }

    for (const [key, value] of Object.entries(newDefinition)) {
      if (value == null) {
        return res.status(400).json({
          error: {
            message: `Missing '${key}' in request body`,
          },
        })
      }
    }

    DefinitionsService.insertDefinition(req.app.get('db'), newDefinition)
      .then((definition) => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${definition.id}`))
          .json(DefinitionsService.serializeDefinition(definition))
      })
      .catch(next)
  })

module.exports = definitionsRouter
