const express = require('express')
const path = require('path')
const WordsService = require('./words-service')
const DefinitionsService = require('../definitions/definitions-service')
const { requireAuth } = require('../middleware/jwt-auth')

const wordsRouter = express.Router()
const jsonParser = express.json()

wordsRouter
  .route('/')
  .get((req, res, next) => {
    WordsService.getAllWords(req.app.get('db'))
      .then((words) => {
        res.json(words.map(WordsService.serializeWord))
      })
      .catch(next)
  })
  .post(requireAuth, jsonParser, (req, res, next) => {
    const { text } = req.body
    const newWord = { text }

    // check that required word fields are present
    for (const [key, value] of Object.entries(newWord)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        })
      }
    }

    // check if word already exists based on text value
    WordsService.getByText(req.app.get('db'), newWord.text)
      .then((word) => {
        if (word) {
          return res.status(400).json({
            error: { message: `Word already exists` },
          })
        }

        // if word doesn't exist, create it and return response
        return WordsService.insertWord(req.app.get('db'), newWord).then(
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

wordsRouter
  .route('/:word_id')
  .all((req, res, next) => {
    // check if word exists before proceeding to endpoints
    WordsService.getById(req.app.get('db'), req.params.word_id)
      .then((word) => {
        if (!word) {
          return res.status(404).json({
            error: {
              message: `Word does not exist`,
            },
          })
        }
        res.word = word
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(WordsService.serializeWord(res.word))
  })
  .delete(requireAuth, (req, res, next) => {
    DefinitionsService.getByWordId(req.app.get('db'), req.params.word_id)
      .then((defs) => {
        // if the word has definitions, return unauthorized
        if (defs.length > 0) {
          return res.status(400).json({
            error: {
              message: `Cannot delete a word with existing definitions`,
            },
          })
        }

        // otherwise delete the word
        return WordsService.deleteWord(
          req.app.get('db'),
          req.params.word_id
        ).then(() => res.status(204).end())
      })
      .catch(next)
  })
  .patch(requireAuth, jsonParser, async function (req, res, next) {
    try {
      const { text } = req.body
      const wordToUpdate = { text }

      // check if request contains all values needed
      const numberOfValues = Object.values(wordToUpdate).filter(Boolean).length
      if (numberOfValues == 0) {
        return res.status(400).json({
          error: {
            message: `Request body must contain 'text'`,
          },
        })
      }

      const defs = await DefinitionsService.getByWordId(
        req.app.get('db'),
        req.params.word_id
      )
      // if the word has definitions, return unauthorized
      if (defs.length > 0) {
        return res.status(400).json({
          error: {
            message: `Cannot update a word with existing definitions`,
          },
        })
      }

      // otherwise update the word
      WordsService.updateWord(
        req.app.get('db'),
        req.params.word_id,
        wordToUpdate
      ).then(() => res.status(204).end())
    } catch (error) {
      next(error)
    }
  })

wordsRouter
  .route('/:word_id/definitions')
  .all((req, res, next) => {
    // check if word exists before proceeding to endpoints
    WordsService.getById(req.app.get('db'), req.params.word_id)
      .then((word) => {
        if (!word) {
          return res.status(404).json({
            error: {
              message: `Word does not exist`,
            },
          })
        }
        res.word = word
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    DefinitionsService.getByWordId(req.app.get('db'), req.params.word_id)
      .then((defs) => {
        res.json(defs.map(DefinitionsService.serializeDefinition))
      })
      .catch(next)
  })

module.exports = wordsRouter
