const WordsService = {
  getAllWords(db) {
    return db.select('*').from('word')
  },
}

module.exports = WordsService
