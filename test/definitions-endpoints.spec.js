const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')
const {
  makeDefinitionsFixtures,
  makeExpectedDefinition,
  cleanTables,
  seedDefinitions,
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
          .send(newDefinition)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`,
            },
          })
      })
    })
  })
})
