const express = require('express')
const path = require('path')
const UserDefinitionsService = require('./user-definitions-service')
const { requireAuth } = require('../middleware/jwt-auth')
const DefinitionsService = require('../definitions/definitions-service')

const userDefinitionsRouter = express.Router()
const jsonParser = express.json()

userDefinitionsRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    UserDefinitionsService.getAllDefinitions(req.app.get('db')).then(
      (definitions) => {
        const ids = definitions.map((def) => def.definition_id)
        return DefinitionsService.getAllById(req.app.get('db'), ids).then(
          (defs) => {
            res.json(defs.map(DefinitionsService.serializeDefinition))
          }
        )
      }
    )
  })
  .post(jsonParser, (req, res, next) => {
    const { definition_id } = req.body
    const newDefinition = { definition_id }

    // TODO: check that word is saved to user-words, if not, add that word

    // check that required definition fields are present
    for (const [key, value] of Object.entries(newDefinition)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        })
      }
    }

    newDefinition.user_id = req.user.id

    // check if definition is already in user's dictionary
    UserDefinitionsService.getByDefinitionId(
      req.app.get('db'),
      newDefinition.definition_id
    )
      .then((def) => {
        if (def) {
          return res.status(400).json({
            error: {
              message: 'Definition already exists in your dictionary',
            },
          })
        }

        // check if definition exists at all
        return DefinitionsService.getById(
          req.app.get('db'),
          newDefinition.definition_id
        )
          .then((def) => {
            if (!def) {
              return res.status(404).json({
                error: {
                  message: 'This definition does not exist',
                },
              })
            }
            // if definition doesn't exist, create it and return response from res.definition object
            return UserDefinitionsService.insertDefinition(
              req.app.get('db'),
              newDefinition
            ).then(() => {
              res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${def.id}`))
                .json(DefinitionsService.serializeDefinition(def))
            })
          })

          .catch(next)
      })
      .catch(next)
  })

userDefinitionsRouter
  .route('/:definition_id')
  .all(requireAuth)
  .all(checkUserDefinitionExists)
  .get((req, res, next) => {
    DefinitionsService.getById(
      req.app.get('db'),
      res.definition.definition_id
    ).then((def) => {
      res.json(DefinitionsService.serializeDefinition(def))
    })
  })
  .delete((req, res, next) => {
    UserDefinitionsService.deleteDefinition(
      req.app.get('db'),
      res.definition.definition_id
    )
      .then(() => res.status(204).end())
      .catch(next)
  })

async function checkUserDefinitionExists(req, res, next) {
  try {
    const definition = await UserDefinitionsService.getByDefinitionId(
      req.app.get('db'),
      req.params.definition_id
    )
    // if definition doesn't exist, return error
    if (!definition)
      return res.status(404).json({
        error: {
          message: `This definition does not exist in your dictionary`,
        },
      })

    // if definition exists, attach to res object
    res.definition = definition
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = userDefinitionsRouter
