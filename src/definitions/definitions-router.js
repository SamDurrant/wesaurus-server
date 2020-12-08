const express = require('express')
const path = require('path')
const DefinitionsService = require('./definitions-service')
const { requireAuth } = require('../middleware/jwt-auth')

const definitionsRouter = express.Router()
const jsonParser = express.json()

definitionsRouter
  .route('/')
  .get((req, res, next) => {
    // get all definitions and send serialized
    DefinitionsService.getAllDefinitions(req.app.get('db'))
      .then((defs) => {
        res.json(defs.map(DefinitionsService.serializeDefinition))
      })
      .catch(next)
  })
  .post(requireAuth, jsonParser, (req, res, next) => {
    const { word_id, text } = req.body
    const newDefinition = { word_id, text }

    // check that required word fields are present
    for (const [key, value] of Object.entries(newDefinition)) {
      if (value == null) {
        return res.status(400).json({
          error: {
            message: `Missing '${key}' in request body`,
          },
        })
      }
    }

    newDefinition.author_id = req.user.id

    // create definition and return response
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
  .patch(requireAuth, jsonParser, (req, res, next) => {
    const { text } = req.body
    const definitionToUpdate = { text }

    const numOfValues = Object.values(definitionToUpdate).filter(Boolean).length

    // check if request contain all values needed
    if (numOfValues == 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'text'`,
        },
      })
    }

    // check if request user is author
    if (res.definition.author_id !== req.user.id) {
      return res.status(400).json({
        error: {
          message: `You are not the author of this definition`,
        },
      })
    }

    // update definition
    DefinitionsService.updateDefinition(
      req.app.get('db'),
      req.params.definition_id,
      definitionToUpdate
    )
      .then(() => res.status(204).end())
      .catch(next)
  })
  .delete(requireAuth, (req, res, next) => {
    // delete definition
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

    // if definition doesn't exist, return error
    if (!definition)
      return res.status(404).json({
        error: {
          message: `Definition doesn't exist`,
        },
      })

    // if definition exists, attach to res object
    res.definition = definition
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = definitionsRouter
