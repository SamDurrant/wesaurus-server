const UserDefinitionsService = {
  getAllDefinitions(db) {
    return db.select('*').from('saved_definition')
  },
  getByDefinitionId(db, definition_id) {
    return db
      .from('saved_definition')
      .select('*')
      .where({ definition_id })
      .first()
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
  deleteDefinition(db, definition_id) {
    return db('saved_definition').where({ definition_id }).delete()
  },
}

module.exports = UserDefinitionsService
