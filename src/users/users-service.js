const xss = require('xss')
const PASSWORD_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const UsersService = {
  hasUserWithUserName(db, user_name) {
    return db('we_user')
      .where({ user_name })
      .first()
      .then((user) => !!user)
  },
  hasUserWithEmail(db, email) {
    return db('we_user')
      .where({ email })
      .first()
      .then((user) => !!user)
  },
  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('we_user')
      .returning('*')
      .then(([user]) => user)
  },
  validatePassword(password) {
    if (password.length < 8) {
      return 'Password must be longer than 8 characters'
    }
    if (password.length > 24) {
      return 'Password must be less than 24 characters'
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces'
    }
    if (!PASSWORD_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain 1 upper case, lower case, number and special character'
    }
    return null
  },
  validateEmail(email) {
    if (!EMAIL_REGEX.test(email)) {
      return 'Email is invalid'
    }
    return null
  },
  serializeUser(user) {
    return {
      id: user.id,
      user_name: xss(user.user_name),
      email: xss(user.email),
      date_created: new Date(user.date_created),
    }
  },
}

module.exports = UsersService
