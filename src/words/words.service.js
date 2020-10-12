const WordsService = {
  getAllWords(db) {
    return db.select('*').from('word')
  },
  insertWord(db, newWord) {
    return db
      .insert(newWord)
      .into('word')
      .returning('*')
      .then((rows) => {
        return rows[0]
      })
  },
  getByText(db, text) {
    return WordsService.getAllWords(db).where('word.text', text).first()
  },
}

module.exports = WordsService
