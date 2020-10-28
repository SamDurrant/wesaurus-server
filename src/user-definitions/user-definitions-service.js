const UserDefinitionsService = {
  getAllDefinitions(db, user_id) {
    return db
      .select('*')
      .from('saved_definition')
      .where({ user_id })
      .join('definition', { 'definition.id': 'saved_definition.definition_id' })
  },
  getByDefinitionId(db, user_id, definition_id) {
    return db
      .from('saved_definition')
      .select('*')
      .where({ definition_id, user_id })
      .first()
      .join('definition', { 'definition.id': 'saved_definition.definition_id' })
  },
  getByWordId(db, user_id, word_id) {
    return db
      .from('saved_definition')
      .select('*')
      .where({ user_id })
      .join('definition', {
        'definition.id': 'saved_definition.definition_id',
        word_id: word_id,
      })
  },
  insertDefinition(db, newDefinition) {
    return db
      .insert(newDefinition)
      .into('saved_definition')
      .returning('*')
      .then((rows) => {
        return rows[0]
      })
  },
  deleteDefinition(db, user_id, definition_id) {
    return db('saved_definition').where({ definition_id, user_id }).delete()
  },
}

module.exports = UserDefinitionsService
