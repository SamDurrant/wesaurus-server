const express = require('express')
const path = require('path')
const UserDefinitionsService = require('./user-definitions-service')
const { requireAuth } = require('../middleware/jwt-auth')
const DefinitionsService = require('../definitions/definitions-service')
const UserWordsService = require('../user-words/user-words-service')

const userDefinitionsRouter = express.Router()
const jsonParser = express.json()

userDefinitionsRouter
  .route('/')
  .all(requireAuth)
  .get(async function (req, res, next) {
    try {
      UserDefinitionsService.getAllDefinitions(
        req.app.get('db'),
        req.user.id
      ).then((defs) => {
        res.json(defs.map(DefinitionsService.serializeDefinition))
      })
    } catch (error) {
      next(error)
    }
  })
  .post(jsonParser, async function (req, res, next) {
    try {
      const { definition_id } = req.body
      const newDef = { definition_id }

      // check that required definition fields are present
      for (const [key, value] of Object.entries(newDef)) {
        if (value == null) {
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body` },
          })
        }
      }
      newDef.user_id = req.user.id

      // check if definition is already in user's dictionary
      const alreadySaved = await UserDefinitionsService.getByDefinitionId(
        req.app.get('db'),
        req.user.id,
        newDef.definition_id
      )

      if (alreadySaved) {
        return res.status(400).json({
          error: {
            message: 'Definition already exists in your dictionary',
          },
        })
      }

      // check if definition exists at all
      const defDoesExist = await DefinitionsService.getById(
        req.app.get('db'),
        newDef.definition_id
      )
      if (!defDoesExist) {
        return res.status(404).json({
          error: {
            message: 'This definition does not exist',
          },
        })
      }

      // check that word is saved to user-words, if not, add that word
      const isWordSaved = await UserWordsService.getByWordId(
        req.app.get('db'),
        defDoesExist.word_id,
        req.user.id
      )
      if (!isWordSaved) {
        const newWord = { word_id: defDoesExist.word_id, user_id: req.user.id }
        const saveWord = await UserWordsService.insertWord(
          req.app.get('db'),
          newWord
        )
      }
      const insertDef = UserDefinitionsService.insertDefinition(
        req.app.get('db'),
        newDef
      )

      if (insertDef) {
        DefinitionsService.incrementLikeCount(
          req.app.get('db'),
          defDoesExist.id
        ).then(() => {
          const defData = {
            ...defDoesExist,
            like_count: defDoesExist.like_count + 1,
          }
          res
            .status(201)
            .location(path.posix.join(req.originalUrl, `/${defDoesExist.id}`))
            .json(DefinitionsService.serializeDefinition(defData))
        })
      }
    } catch (error) {
      next(error)
    }
  })

userDefinitionsRouter
  .route('/:definition_id')
  .all(requireAuth)
  .all(checkUserDefinitionExists)
  .get((req, res, next) => {
    res.json(DefinitionsService.serializeDefinition(res.definition))
  })
  .delete((req, res, next) => {
    UserDefinitionsService.deleteDefinition(
      req.app.get('db'),
      req.user.id,
      res.definition.definition_id
    )
      .then(() =>
        DefinitionsService.decrementLikeCount(
          req.app.get('db'),
          res.definition.definition_id
        ).then(() => {
          res.status(204).end()
        })
      )
      .catch(next)
  })

async function checkUserDefinitionExists(req, res, next) {
  try {
    const definition = await UserDefinitionsService.getByDefinitionId(
      req.app.get('db'),
      req.user.id,
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
