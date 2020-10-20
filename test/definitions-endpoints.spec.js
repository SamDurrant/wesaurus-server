const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')
const {
  makeDefinitionsFixtures,
  makeExpectedDefinition,
  cleanTables,
  seedDefinitions,
  makeUsersArray,
  makeWordsArray,
  makeMaliciousDefinition,
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
})
