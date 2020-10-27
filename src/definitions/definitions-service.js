const xss = require('xss')

const DefinitionsService = {
  getAllDefinitions(db) {
    return db.select('*').from('definition')
  },
  getById(db, id) {
    return db.from('definition').select('*').where({ id }).first()
  },
  getAllById(db, ids) {
    return db.select('*').from('definition').whereIn('id', ids)
  },
  getByWordId(db, word_id) {
    return db.from('definition').select('*').where({ word_id })
  },
  insertDefinition(db, newDef) {
    return db
      .insert(newDef)
      .into('definition')
      .returning('*')
      .then((rows) => {
        return rows[0]
      })
  },
  deleteDefinition(db, id) {
    return db('definition').where({ id }).delete()
  },
  updateDefinition(db, id, newDefFields) {
    return db('definition').where({ id }).update(newDefFields)
  },
  serializeDefinition(def) {
    return {
      id: def.id,
      user_id: def.user_id,
      word_id: def.word_id,
      text: xss(def.text),
      like_count: Number(def.like_count),
      date_created: new Date(def.date_created),
    }
  },
}

module.exports = DefinitionsService
