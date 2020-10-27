const UserSettingsService = {
  getSettings(db, user_id) {
    return db.from('settings').select('*').where({ user_id }).first()
  },
  updateSettings(db, user_id, fields) {
    return db('settings').where({ user_id }).update({
      dark_mode: fields.dark_mode,
    })
  },
}

module.exports = UserSettingsService
