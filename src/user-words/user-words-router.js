const express = require('express')
const path = require('path')
const UserWordsService = require('./user-words-service')
const WordsService = require('../words/words-service')
const { requireAuth } = require('../middleware/jwt-auth')
const UserDefinitionsService = require('../user-definitions/user-definitions-service')

const userWordsRouter = express.Router()
const jsonParser = express.json()

userWordsRouter
  .route('/')
  .all(requireAuth)
  .get(async function (req, res, next) {
    try {
      const words = await UserWordsService.getAllWords(
        req.app.get('db'),
        req.user.id
      )
      const ids = words.map((word) => word.word_id)

      WordsService.getAllById(req.app.get('db'), ids).then((words) => {
        res.json(words.map(WordsService.serializeWord))
      })
    } catch (error) {
      next(error)
    }
  })
  .post(jsonParser, async function (req, res, next) {
    try {
      const { word_id } = req.body
      const newWord = { word_id }

      // check that required word fields are present
      for (const [key, value] of Object.entries(newWord)) {
        if (value == null) {
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body` },
          })
        }
      }

      newWord.user_id = req.user.id

      // check if word is already in user's dictionary
      const isWordSaved = await UserWordsService.getByWordId(
        req.app.get('db'),
        newWord.word_id,
        req.user.id
      )

      if (isWordSaved) {
        return res.status(400).json({
          error: {
            message: 'Word already exists in your dictionary',
          },
        })
      }

      // check if word exists at all
      const wordDoesExist = await WordsService.getById(
        req.app.get('db'),
        newWord.word_id
      )
      if (!wordDoesExist) {
        return res.status(404).json({
          error: {
            message: 'This word does not exist',
          },
        })
      }

      // if word doesn't exist, create it and return response
      UserWordsService.insertWord(req.app.get('db'), newWord).then(() => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${wordDoesExist.id}`))
          .json(WordsService.serializeWord(wordDoesExist))
      })
    } catch (error) {
      next(error)
    }
  })

userWordsRouter
  .route('/:word_id')
  .all(requireAuth)
  .all(checkWordExists)
  .get((req, res, next) => {
    WordsService.getById(req.app.get('db'), res.word.word_id).then((word) => {
      res.json(WordsService.serializeWord(word))
    })
  })
  .delete((req, res, next) => {
    // delete word
    UserWordsService.deleteWord(req.app.get('db'), res.word.word_id)
      .then(() => res.status(204).end())
      .catch(next)
  })

async function checkWordExists(req, res, next) {
  try {
    const word = await UserWordsService.getByWordId(
      req.app.get('db'),
      req.params.word_id,
      req.user.id
    )
    // if word doesn't exist, return error
    if (!word)
      return res.status(404).json({
        error: {
          message: `This word does not exist in your dictionary`,
        },
      })

    // if word exists, attach to res object
    res.word = word
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = userWordsRouter
