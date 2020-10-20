const express = require('express')
const path = require('path')
const xss = require('xss')
const WordsService = require('./words-service')

const wordsRouter = express.Router()
const jsonParser = express.json()

const serializeWord = (word) => ({
  id: word.id,
  text: xss(word.text),
})

wordsRouter
  .route('/')
  .get((req, res, next) => {
    WordsService.getAllWords(req.app.get('db'))
      .then((words) => {
        res.json(words.map(serializeWord))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { text } = req.body
    const newWord = { text }

    // check that word values are present
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
              .json(serializeWord(word))
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
    res.json(serializeWord(res.word))
  })
  .delete((req, res, next) => {
    // TODO: check if word has definitions, if so, do not delete word
    console.log('hello')
    WordsService.deleteWord(req.app.get('db'), req.params.word_id)
      .then(() => res.status(204).end())
      .catch(next)
  })
  .patch((req, res, next) => {
    const { text } = req.body
    const wordToUpdate = { text }

    // TODO: check if word has definitions, if so, do not update word

    // check if request contains all values needed
    const numberOfValues = Object.values(wordToUpdate).filter(Boolean).length
    if (numberOfValues == 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'text'`,
        },
      })
    }

    WordsService.updateWord(req.app.get('db'), req.params.word_id, wordToUpdate)
      .then(() => res.status(204).end())
      .catch(next)
  })

module.exports = wordsRouter
