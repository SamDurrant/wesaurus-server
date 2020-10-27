const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.user_name,
    algorithm: 'HS256',
  })
  return `Bearer ${token}`
}

function makeWordsArray() {
  return [
    {
      id: 1,
      text: 'Boolean',
    },
    {
      id: 2,
      text: 'String',
    },
    {
      id: 3,
      text: 'Object',
    },
  ]
}

function makeUserWordsArray() {
  return [
    { user_id: 1, word_id: 1 },
    { user_id: 1, word_id: 2 },
  ]
}

function makeMaliciousWord() {
  const maliciousWord = {
    id: 123,
    text: `wo<script>alert("xss");</script>rd <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
  }
  const expectedWord = {
    id: 123,
    text: `wo&lt;script&gt;alert("xss");&lt;/script&gt;rd <img src="https://url.to.file.which/does-not.exist">`,
  }
  return {
    maliciousWord,
    expectedWord,
  }
}

function makeMaliciousDefinition(user, word) {
  const maliciousDefinition = {
    id: 91,
    user_id: user.id,
    word_id: word.id,
    like_count: 15,
    date_created: new Date(),
    text: `wo<script>alert("xss");</script>rd <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
  }
  const expectedDefinition = {
    ...makeExpectedDefinition([user], [word], maliciousDefinition),
    text: `wo&lt;script&gt;alert("xss");&lt;/script&gt;rd <img src="https://url.to.file.which/does-not.exist">`,
  }

  return { maliciousDefinition, expectedDefinition }
}

function makeUsersArray() {
  return [
    {
      id: 1,
      user_name: 'test-user-1',
      email: 'testuser1@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      user_name: 'test-user-2',
      email: 'testuser2@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      user_name: 'test-user-3',
      email: 'testuser3@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ]
}

function makeUserSettingsArray() {
  return [
    {
      id: 1,
      dark_mode: false,
      user_id: 1,
    },
    {
      id: 2,
      dark_mode: false,
      user_id: 2,
    },
    {
      id: 3,
      dark_mode: false,
      user_id: 3,
    },
  ]
}

function makeUserDefinitionsArray() {
  return [
    { user_id: 1, definition_id: 1 },
    { user_id: 1, definition_id: 2 },
  ]
}

function makeExpectedUserDefinitionsArray(userDefs, allDefs) {
  return userDefs.map((def) => allDefs.find((w) => w.id === def.definition_id))
}

function makeDefinitionsArray(users, words) {
  return [
    {
      id: 1,
      user_id: users[0].id,
      word_id: words[0].id,
      like_count: 15,
      date_created: new Date().toISOString(),
      text: 'A true or false value.',
    },
    {
      id: 2,
      user_id: users[0].id,
      word_id: words[1].id,
      like_count: 15,
      date_created: new Date().toISOString(),
      text:
        'A string is a sequence of one or more characters that may consist of letters, numbers, or symbols.',
    },
    {
      id: 3,
      user_id: users[1].id,
      word_id: words[1].id,
      like_count: 15,
      date_created: new Date().toISOString(),
      text: 'A string is zero or more characters written inside quotes.',
    },
    {
      id: 4,
      user_id: users[2].id,
      word_id: words[1].id,
      like_count: 15,
      date_created: new Date().toISOString(),
      text:
        'An object is a standalone entity, with properties and type. Compare it with a cup, for example. A cup is an object, with properties. A cup has a color, a design, weight, a material it is made of, etc.',
    },
  ]
}

function makeExpectedDefinition(users, words, definition) {
  const user = users.find((u) => u.id === definition.user_id)
  const word = words.find((w) => w.id === definition.word_id)

  return {
    id: definition.id,
    user_id: user.id,
    word_id: word.id,
    like_count: definition.like_count,
    date_created: definition.date_created,
    text: definition.text,
  }
}

function makeExpectedUserWordsArray(userWords, allWords) {
  return userWords.map((word) => allWords.find((w) => w.id === word.word_id))
}

function cleanTables(db) {
  return db.transaction((trx) =>
    trx
      .raw(
        `TRUNCATE word, we_user, definition, settings, saved_word, saved_definition`
      )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE word_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE we_user_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE definition_id_seq minvalue 0 START WITH 1`),
          trx.raw(`ALTER SEQUENCE settings_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('word_id_seq', 0)`),
          trx.raw(`SELECT setval('we_user_id_seq', 0)`),
          trx.raw(`SELECT setval('definition_id_seq', 0)`),
          trx.raw(`SELECT setval('settings_id_seq', 0)`),
        ])
      )
  )
}

function makeDefinitionsFixtures() {
  const testUsers = makeUsersArray()
  const testWords = makeWordsArray()
  const testDefinitions = makeDefinitionsArray(testUsers, testWords)

  return { testUsers, testWords, testDefinitions }
}

function seedUsers(db, users) {
  const preppedUsers = users.map((user) => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1),
  }))

  return db
    .into('we_user')
    .insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(`SELECT setval('we_user_id_seq', ?)`, [users[users.length - 1].id])
    )
    .then(() => {
      return seedSettings(db, preppedUsers)
    })
}

function seedSettings(db, preppedUsers) {
  const settings = preppedUsers.map((u, i) => ({
    id: i + 1,
    dark_mode: false,
    user_id: u.id,
  }))

  return db
    .into('settings')
    .insert(settings)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(`SELECT setval('settings_id_seq', ?)`, [
        settings[settings.length - 1].id,
      ])
    )
}

function seedWords(db, words) {
  return db
    .into('word')
    .insert(words)
    .then(() =>
      db.raw(`SELECT setval('word_id_seq', ?)`, [words[words.length - 1].id])
    )
}

function seedUserWords(db, words) {
  return db.into('saved_word').insert(words)
}

function seedDefinitions(db, users, words, definitions) {
  return db.transaction(async (trx) => {
    await seedUsers(trx, users)
    await seedWords(trx, words)
    await trx.into('definition').insert(definitions)
    await trx.raw(`SELECT setval('definition_id_seq', ?)`, [
      definitions[definitions.length - 1].id,
    ])
  })
}

function seedUserDefinitions(db, definitions) {
  return db.into('saved_definition').insert(definitions)
}

module.exports = {
  makeAuthHeader,
  makeWordsArray,
  makeUserWordsArray,
  makeUserDefinitionsArray,
  makeDefinitionsArray,
  makeMaliciousWord,
  makeMaliciousDefinition,
  makeUsersArray,
  makeUserSettingsArray,
  makeExpectedUserWordsArray,
  makeExpectedUserDefinitionsArray,
  makeDefinitionsFixtures,
  makeExpectedDefinition,
  seedUsers,
  seedUserWords,
  seedWords,
  seedDefinitions,
  seedUserDefinitions,
  cleanTables,
}
