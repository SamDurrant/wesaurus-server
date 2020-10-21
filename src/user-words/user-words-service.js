const UserWordsService = {
  getAllWords(db) {
    return db.select('*').from('saved_word')
  },
  getByWordId(db, word_id) {
    return db.from('saved_word').select('*').where({ word_id }).first()
  },
  insertWord(db, newWord) {
    return db
      .insert(newWord)
      .into('saved_word')
      .returning('*')
      .then((rows) => {
        return rows[0]
      })
  },
  deleteWord(db, id) {
    return db('saved_word').where({ id }).delete()
  },
  updateWord(db, id, newWordFields) {
    return db('saved_word').where({ id }).update(newWordFields)
  },
  getByText(db, text) {
    return WordsService.getAllWords(db).where('saved_word.text', text).first()
  },
}

module.exports = UserWordsService
