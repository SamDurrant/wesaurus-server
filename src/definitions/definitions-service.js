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
  getByUserId(db, user_id) {
    return db
      .from('definition AS def')
      .join('word AS defWord', 'def.word_id', 'defWord.id')
      .select(
        'def.id',
        'def.author_id',
        'def.word_id',
        'def.text',
        'def.like_count',
        'def.date_created',
        'defWord.text AS word_text'
      )
      .orderBy('date_created', 'desc')
      .where('author_id', user_id)
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
  incrementLikeCount(db, id) {
    return db('definition').select('*').where({ id }).increment('like_count')
  },
  decrementLikeCount(db, id) {
    return db('definition').where({ id }).decrement('like_count')
  },
  serializeDefinition(def) {
    let serialized = {
      id: def.id,
      author_id: def.author_id,
      word_id: def.word_id,
      text: xss(def.text),
      like_count: Number(def.like_count),
      date_created: new Date(def.date_created),
    }
    if (def.word_text) {
      serialized.word_text = xss(def.word_text)
    }
    return serialized
  },
}

module.exports = DefinitionsService
