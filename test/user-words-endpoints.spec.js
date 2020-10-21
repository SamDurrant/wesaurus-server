const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')

const {
  makeMaliciousWord,
  makeAuthHeader,
  makeDefinitionsFixtures,
  seedDefinitions,
  makeUserWordsArray,
  seedUserWords,
  cleanTables,
  makeExpectedUserWordsArray,
} = require('./test-helpers')

describe('User-Words Endpoints', function () {
  let db
  const { testUsers, testWords, testDefinitions } = makeDefinitionsFixtures()
  const testUserWords = makeUserWordsArray()
  const testUser = testUsers[0]
  const expectedUserWords = makeExpectedUserWordsArray(testUserWords, testWords)

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => cleanTables(db))

  afterEach('cleanup', () => cleanTables(db))

  //
  // GET ENDPOINT
  //
  describe('GET /api/users/:user_id/words', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context(`Given no user words`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, [])
      })
    })

    context(`Given there are user words`, () => {
      beforeEach('insert user words', () => seedUserWords(db, testUserWords))

      it('responds with 200 and all of the words', () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(expectedUserWords)
      })
    })

    context(`Given XSS attack content`, () => {
      const { maliciousWord, expectedWord } = makeMaliciousWord()

      beforeEach('insert malicious word', () => {
        return db
          .insert([maliciousWord])
          .into('word')
          .then(() =>
            db
              .insert([{ user_id: testUser.id, word_id: maliciousWord.id }])
              .into('saved_word')
          )
      })

      it(`removes XSS attack context`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200)
          .expect((res) => {
            expect(res.body[0].text).to.eql(expectedWord.text)
            expect(res.body[0].id).to.eql(expectedWord.id)
          })
      })
    })
  })

  //
  // POST ENDPOINT
  //
  describe('POST /api/users/:user_id/words', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context(`Given the word already exists in user's words`, () => {
      beforeEach('insert user words', () => seedUserWords(db, testUserWords))
      const newWord = {
        word_id: testUserWords[0].word_id,
      }

      it(`responds with 400 already exists if word in user's dictionary`, () => {
        return supertest(app)
          .post(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newWord)
          .expect(400, {
            error: {
              message: 'Word already exists in your dictionary',
            },
          })
      })
    })

    context(`Given the word does not exist in user's dictionary`, () => {
      const newWord = {
        word_id: testWords[2].id,
      }

      it(`adds the word, responding with 201 and the new word`, () => {
        return supertest(app)
          .post(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newWord)
          .expect(201)
          .expect((res) => {
            expect(res.body).to.have.property('id')
            expect(res.body.text).to.eql(testWords[2].text)
            expect(res.headers.location).to.eql(
              `/api/users/${testUser.id}/words/${res.body.id}`
            )
          })
          .expect((res) => {
            db.from('word')
              .where({ id: res.body.id })
              .first()
              .then((row) => {
                expect(row.text).to.eql(testWords[2].text)
              })
          })
      })
    })

    const requiredFields = ['word_id']

    requiredFields.forEach((field) => {
      const newWord = {
        word_id: testWords[2].id,
      }

      it(`responds with 400 and an error message when the '${field} is missing`, () => {
        delete newWord[field]

        return supertest(app)
          .post(`/api/users/${testUser.id}/words`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newWord)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`,
            },
          })
      })

      context(`Given XSS attack content`, () => {
        const { maliciousWord, expectedWord } = makeMaliciousWord()
        const newWord = {
          word_id: maliciousWord.id,
        }

        beforeEach('insert malicious word', () => {
          return db.insert([maliciousWord]).into('word')
        })

        it(`removes XSS attack context`, () => {
          return supertest(app)
            .post(`/api/users/${testUser.id}/words`)
            .set('Authorization', makeAuthHeader(testUser))
            .send(newWord)
            .expect(201)
            .expect((res) => {
              expect(res.body.text).to.eql(expectedWord.text)
              expect(res.body.id).to.eql(expectedWord.id)
            })
        })
      })
    })
  })
})
