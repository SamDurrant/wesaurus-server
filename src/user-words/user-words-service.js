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
  deleteWord(db, word_id) {
    return db('saved_word').where({ word_id }).delete()
  },
}

module.exports = UserWordsService
