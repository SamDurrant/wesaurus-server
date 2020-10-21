const express = require('express')
const path = require('path')
const UserWordsService = require('./user-words-service')
const WordsService = require('../words/words-service')
const { requireAuth } = require('../middleware/jwt-auth')

const userWordsRouter = express.Router()
const jsonParser = express.json()

userWordsRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    UserWordsService.getAllWords(req.app.get('db')).then((words) => {
      const ids = words.map((word) => word.word_id)
      return WordsService.getAllById(req.app.get('db'), ids).then((words) => {
        res.json(words.map(WordsService.serializeWord))
      })
    })
  })
  .post(jsonParser, (req, res, next) => {
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
    UserWordsService.getByWordId(req.app.get('db'), newWord.word_id)
      .then((word) => {
        if (word) {
          return res.status(400).json({
            error: {
              message: 'Word already exists in your dictionary',
            },
          })
        }

        // if word doesn't exist, create it and return response
        return UserWordsService.insertWord(req.app.get('db'), newWord)
          .then((word) => {
            return WordsService.getById(req.app.get('db'), word.word_id).then(
              (word) => {
                res
                  .status(201)
                  .location(path.posix.join(req.originalUrl, `/${word.id}`))
                  .json(WordsService.serializeWord(word))
              }
            )
          })
          .catch(next)
      })
      .catch(next)
  })

module.exports = userWordsRouter
