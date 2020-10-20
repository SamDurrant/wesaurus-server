const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')

const {
  makeWordsArray,
  makeMaliciousWord,
  seedWords,
} = require('./test-helpers')

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

      beforeEach('insert words', () => seedWords(db, testWords))

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

  //
  // GET SPECIFIC ENDPOINT
  //
  describe('GET /api/words/:word_id', () => {
    context(`Given no words`, () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .get('/api/words/1')
          .expect(404, {
            error: {
              message: `Word does not exist`,
            },
          })
      })
    })

    context(`Given there are words in the database`, () => {
      const testWords = makeWordsArray()

      beforeEach('insert words', () => seedWords(db, testWords))

      it('responds with 200 and the specified word', () => {
        const wordId = 2
        const expectedWord = testWords[wordId - 1]

        return supertest(app)
          .get(`/api/words/${wordId}`)
          .expect(200, expectedWord)
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
  // DELETE SPECIFIC ENDPOINT
  //
  describe('DELETE /api/words/:word_id', () => {
    context('Given no words', () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .delete('/api/words/1')
          .expect(404, {
            error: {
              message: `Word does not exist`,
            },
          })
      })
    })

    context('Given there are words in the database', () => {
      const testWords = makeWordsArray()

      beforeEach('insert words', () => {
        return db.into('word').insert(testWords)
      })

      it(`responds with 204 and removes the word`, () => {
        const idToRemove = 2
        const expectedWords = testWords.filter((word) => word.id !== idToRemove)

        return supertest(app)
          .delete(`/api/words/${idToRemove}`)
          .expect(204)
          .then((res) => supertest(app).get(`/api/words`).expect(expectedWords))
      })
    })
  })

  //
  // UPDATE SPECIFIC ENDPOINT
  //
  describe('PATCH /api/words/:word_id', () => {
    const idToUpdate = 2
    const updatedWord = {
      text: 'Array',
    }

    context('Given no words', () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .patch(`/api/words/${idToUpdate}`)
          .send(updatedWord)
          .expect(404, {
            error: {
              message: `Word does not exist`,
            },
          })
      })
    })

    context(`Given there are words in the database`, () => {
      const testWords = makeWordsArray()

      beforeEach('insert words', () => {
        return db.into('word').insert(testWords)
      })

      it(`responds with 204 and updates the word`, () => {
        const expectedWord = {
          ...testWords[idToUpdate - 1],
          ...updatedWord,
        }

        return supertest(app)
          .patch(`/api/words/${idToUpdate}`)
          .send(updatedWord)
          .expect(204)
          .then(() =>
            supertest(app).get(`/api/words/${idToUpdate}`).expect(expectedWord)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        return supertest(app)
          .patch(`/api/words/${idToUpdate}`)
          .send({ irrelevantField: 'nonsense' })
          .expect(400, {
            error: {
              message: `Request body must contain 'text'`,
            },
          })
      })
    })
  })
})
