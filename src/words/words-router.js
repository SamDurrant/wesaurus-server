const express = require('express')

const WordsService = require('./words.service')

const wordsRouter = express.Router()
const jsonParser = express.json()

wordsRouter.route('/').get((req, res, next) => {
  WordsService.getAllWords(req.app.get('db'))
    .then((words) => {
      console.log(words)
      res.json(words)
    })
    .catch(next)
})

module.exports = wordsRouter
