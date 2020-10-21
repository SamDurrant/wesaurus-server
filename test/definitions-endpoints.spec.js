const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')
const {
  makeAuthHeader,
  makeDefinitionsFixtures,
  makeExpectedDefinition,
  cleanTables,
  seedDefinitions,
  makeMaliciousDefinition,
  seedUsers,
  seedWords,
} = require('./test-helpers')

describe('Definitions Endpoints', function () {
  let db

  const { testUsers, testWords, testDefinitions } = makeDefinitionsFixtures()

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => cleanTables(db))

  afterEach('cleanup', () => cleanTables(db))

  //
  // GET ENDPOINT
  //
  describe(`GET /api/definitions`, () => {
    context(`Given no definitions`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get('/api/definitions').expect(200, [])
      })
    })

    context('Given there are definitions in the database', () => {
      beforeEach('insert definitions', () =>
        seedDefinitions(db, testUsers, testWords, testDefinitions)
      )

      it('responds with 200 and all of the definitions', () => {
        const expectedDefinitions = testDefinitions.map((definition) =>
          makeExpectedDefinition(testUsers, testWords, definition)
        )
        return supertest(app)
          .get('/api/definitions')
          .expect(200, expectedDefinitions)
      })
    })

    context(`Given an XSS attack definition`, () => {
      const testUser = testUsers[1]
      const testWord = testWords[1]
      const {
        maliciousDefinition,
        expectedDefinition,
      } = makeMaliciousDefinition(testUser, testWord)

      beforeEach('insert malicious definition', () => {
        return seedDefinitions(
          db,
          [testUser],
          [testWord],
          [maliciousDefinition]
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/definitions`)
          .expect(200)
          .expect((res) => {
            expect(res.body[0].text).to.eql(expectedDefinition.text)
          })
      })
    })
  })

  //
  // POST ENDPOINT
  //
  describe('POST /api/definitions', () => {
    beforeEach('insert definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    it(`creates a definition, responding with 201 and the new definition`, () => {
      const testDefinition = testDefinitions[0]
      const newDefinition = {
        text: 'new test definition',
        user_id: testDefinition.user_id,
        word_id: testDefinition.word_id,
      }

      return supertest(app)
        .post('/api/definitions')
        .set('Authorization', makeAuthHeader(testUsers[0]))
        .send(newDefinition)
        .expect(201)
        .expect((res) => {
          expect(res.body).to.have.property('id')
          expect(res.body.text).to.eql(newDefinition.text)
          expect(res.body.user_id).to.eql(newDefinition.user_id)
          expect(res.body.word_id).to.eql(newDefinition.word_id)
          expect(res.headers.location).to.eql(`/api/definitions/${res.body.id}`)
        })
        .expect((res) =>
          db
            .from('definition')
            .select('*')
            .where({ id: res.body.id })
            .first()
            .then((row) => {
              expect(row.text).to.eql(newDefinition.text)
              expect(row.user_id).to.eql(newDefinition.user_id)
              expect(row.word_id).to.eql(newDefinition.word_id)
              const expectedDate = new Date().toLocaleString()
              const actualDate = new Date(row.date_created).toLocaleString()
              expect(actualDate).to.eql(expectedDate)
            })
        )
    })

    const requiredFields = ['user_id', 'word_id', 'text']

    requiredFields.forEach((field) => {
      const testDefinition = testDefinitions[0]
      const newDefinition = {
        text: 'new test definition',
        user_id: testDefinition.user_id,
        word_id: testDefinition.word_id,
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newDefinition[field]

        return supertest(app)
          .post('/api/definitions')
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .send(newDefinition)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`,
            },
          })
      })
    })
  })

  //
  // GET DEF_ID ENDPOINT
  //
  describe('GET /api/definitions/:definition_id', () => {
    context(`Given no definitions`, () => {
      beforeEach(() =>
        seedUsers(db, testUsers).then(() => seedWords(db, testWords))
      )

      it(`responds with 404`, () => {
        const defId = 123456
        return supertest(app)
          .get(`/api/definitions/${defId}`)
          .expect(404, {
            error: {
              message: `Definition doesn't exist`,
            },
          })
      })
    })

    context(`Given there are definitions in the database`, () => {
      beforeEach(() =>
        seedDefinitions(db, testUsers, testWords, testDefinitions)
      )

      it(`responds with 200 and the specified definition`, () => {
        const defId = 2
        const expectedDefinition = makeExpectedDefinition(
          testUsers,
          testWords,
          testDefinitions[defId - 1]
        )

        return supertest(app)
          .get(`/api/definitions/${defId}`)
          .expect(200, expectedDefinition)
      })
    })

    context(`Given an XSS attack definition`, () => {
      const testUser = testUsers[1]
      const testWord = testWords[1]
      const {
        maliciousDefinition,
        expectedDefinition,
      } = makeMaliciousDefinition(testUser, testWord)

      beforeEach('insert malicious definition', () => {
        return seedDefinitions(
          db,
          [testUser],
          [testWord],
          [maliciousDefinition]
        )
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/definitions/${maliciousDefinition.id}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.text).to.eql(expectedDefinition.text)
          })
      })
    })
  })

  //
  // PATCH DEF_ID ENDPOINT
  //
  describe(`PATCH /api/definitions/:definition_id`, () => {
    context(`Given no definitions`, () => {
      beforeEach(() =>
        seedUsers(db, testUsers).then(() => seedWords(db, testWords))
      )

      it(`responds with 404`, () => {
        return supertest(app)
          .patch('/api/definitions/1')
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .send({ text: 'test 123', like_count: 2 })
          .expect(404, {
            error: {
              message: `Definition doesn't exist`,
            },
          })
      })
    })

    context(`Given there are definitions`, () => {
      beforeEach(() =>
        seedDefinitions(db, testUsers, testWords, testDefinitions)
      )

      it(`responds with 204 and updates the definition`, () => {
        const idToUpdate = 1
        const updatedDefinition = {
          text: 'this is new text',
          like_count: 1,
        }

        const expectedDefinition = {
          ...testDefinitions[idToUpdate - 1],
          ...updatedDefinition,
        }

        return supertest(app)
          .patch(`/api/definitions/${idToUpdate}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .send(updatedDefinition)
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/definitions/${idToUpdate}`)
              .expect((res) => {
                expect(res.body.text).to.eql(expectedDefinition.text)
                expect(res.body.user_id).to.eql(expectedDefinition.user_id)
                expect(res.body.word_id).to.eql(expectedDefinition.word_id)
                const expectedDate = new Date(
                  expectedDefinition.date_created
                ).toLocaleString()
                const actualDate = new Date(
                  res.body.date_created
                ).toLocaleString()
                expect(actualDate).to.eql(expectedDate)
              })
          )
      })

      it(`responds with 400 when wrong required fields are supplied`, () => {
        const idToUpdate = 2

        return supertest(app)
          .patch(`/api/definitions/${idToUpdate}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .send({ irrelevance: 'test test' })
          .expect(400, {
            error: {
              message: `Request body must contain 'text' and 'like_count'`,
            },
          })
      })
    })
  })

  //
  // DELETE DEF_ID ENDPOINT
  //
  describe(`DELETE /api/definitions/:definition_id`, () => {
    context(`Given there are no definitions`, () => {
      beforeEach(() =>
        seedUsers(db, testUsers).then(() => seedWords(db, testWords))
      )

      context(`Given no definitions`, () => {
        it(`responds with 404`, () => {
          return supertest(app)
            .delete('/api/definitions/1')
            .set('Authorization', makeAuthHeader(testUsers[0]))
            .expect(404, {
              error: {
                message: `Definition doesn't exist`,
              },
            })
        })
      })
    })

    context(`Given there are definitions in the database`, () => {
      beforeEach(() =>
        seedDefinitions(db, testUsers, testWords, testDefinitions)
      )

      it(`responds with 204 and removes the definition`, () => {
        const idToRemove = 2
        const expectedDefinitions = testDefinitions.filter(
          (def) => def.id !== idToRemove
        )

        return supertest(app)
          .delete(`/api/definitions/${idToRemove}`)
          .set('Authorization', makeAuthHeader(testUsers[0]))
          .expect(204)
          .then(() =>
            supertest(app).get(`/api/definitions`).expect(expectedDefinitions)
          )
      })
    })
  })
})
