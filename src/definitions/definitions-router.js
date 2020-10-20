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

definitionsRouter
  .route('/:definition_id')
  .all(checkDefinitionExists)
  .get((req, res) => {
    res.json(DefinitionsService.serializeDefinition(res.definition))
  })
  .patch((req, res, next) => {
    const { text, like_count } = req.body
    const definitionToUpdate = { text, like_count }

    const numOfValues = Object.values(definitionToUpdate).filter(Boolean).length

    if (numOfValues == 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'text' and 'like_count'`,
        },
      })
    }

    DefinitionsService.updateDefinition(
      req.app.get('db'),
      req.params.definition_id,
      definitionToUpdate
    )
      .then(() => res.status(204).end())
      .catch(next)
  })
  .delete((req, res, next) => {
    DefinitionsService.deleteDefinition(
      req.app.get('db'),
      req.params.definition_id
    )
      .then(() => res.status(204).end())
      .catch(next)
  })

async function checkDefinitionExists(req, res, next) {
  try {
    const definition = await DefinitionsService.getById(
      req.app.get('db'),
      req.params.definition_id
    )

    if (!definition)
      return res.status(404).json({
        error: {
          message: `Definition doesn't exist`,
        },
      })

    res.definition = definition
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = definitionsRouter
