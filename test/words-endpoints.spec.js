const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')

const { makeWordsArray, makeMaliciousWord } = require('./test-helpers')

describe('Words Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () =>
    db.raw('TRUNCATE word RESTART IDENTITY CASCADE')
  )

  afterEach('cleanup', () => db.raw('TRUNCATE word RESTART IDENTITY CASCADE'))

  //
  // GET ENDPOINT
  //
  describe('GET /api/words', () => {
    context(`Given no words`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get('/api/words').expect(200, [])
      })
    })

    context(`Given there are words`, () => {
      const testWords = makeWordsArray()

      beforeEach('insert words', () => {
        return db.insert(testWords).into('word')
      })

      it('responds with 200 and all of the words', () => {
        return supertest(app).get('/api/words').expect(testWords)
      })
    })

    context(`Given XSS attack content`, () => {
      const { maliciousWord, expectedWord } = makeMaliciousWord()

      beforeEach('insert malicious word', () => {
        return db.insert([maliciousWord]).into('word')
      })

      it(`removes XSS attack context`, () => {
        return supertest(app)
          .get('/api/words')
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
  describe('POST /api/words', () => {
    context(`Given the word already exists`, () => {
      const testWord = makeWordsArray()[0]
      const newWord = {
        text: testWord.text,
      }

      beforeEach('insert word', () => {
        return db.insert([testWord]).into('word')
      })

      it(`responds with 400 already exists if word text exists`, () => {
        return supertest(app)
          .post('/api/words')
          .send(newWord)
          .expect(400, {
            error: {
              message: `Word already exists`,
            },
          })
      })
    })

    it(`creates a word, responding with 201 and the new word`, () => {
      const testWord = makeWordsArray()[0]
      const newWord = {
        text: testWord.text,
      }

      return supertest(app)
        .post('/api/words')
        .send(newWord)
        .expect(201)
        .expect((res) => {
          expect(res.body).to.have.property('id')
          expect(res.body.text).to.eql(newWord.text)
          expect(res.headers.location).to.eql(`/api/words/${res.body.id}`)
        })
        .expect((res) => {
          db.from('word')
            .where({ id: res.body.id })
            .first()
            .then((row) => {
              expect(row.text).to.eql(newWord.text)
              expect(row.id).to.eql(newWord.id)
            })
        })
    })

    const requiredFields = ['text']

    requiredFields.forEach((field) => {
      const testWord = makeWordsArray()[0]
      const newWord = {
        text: testWord.text,
      }

      it(`responds with 400 and an error message when the '${field} is missing`, () => {
        delete newWord[field]

        return supertest(app)
          .post('/api/words')
          .send(newWord)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`,
            },
          })
      })

      context(`Given XSS attack content`, () => {
        const { maliciousWord, expectedWord } = makeMaliciousWord()

        it(`removes XSS attack context`, () => {
          return supertest(app)
            .post('/api/words')
            .send(maliciousWord)
            .expect(201)
            .expect((res) => {
              expect(res.body.text).to.eql(expectedWord.text)
            })
        })
      })
    })
  })
})
