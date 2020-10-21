const xss = require('xss')

const WordsService = {
  getAllWords(db) {
    return db.select('*').from('word')
  },
  getById(db, id) {
    return db.from('word').select('*').where({ id }).first()
  },
  getAllById(db, ids) {
    return db.select('*').from('word').whereIn('id', ids)
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
  deleteWord(db, id) {
    return db('word').where({ id }).delete()
  },
  updateWord(db, id, newWordFields) {
    return db('word').where({ id }).update(newWordFields)
  },
  getByText(db, text) {
    return WordsService.getAllWords(db).where('word.text', text).first()
  },
  serializeWord(word) {
    return {
      id: word.id,
      text: xss(word.text),
    }
  },
}

module.exports = WordsService
