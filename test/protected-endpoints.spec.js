const knex = require('knex')
const app = require('../src/app')
const {
  makeAuthHeader,
  makeDefinitionsFixtures,
  seedDefinitions,
  cleanTables,
} = require('./test-helpers')

describe('Protected endpoints', function () {
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

  beforeEach('insert articles', () =>
    seedDefinitions(db, testUsers, testWords, testDefinitions)
  )

  const protectedEndpoints = [
    {
      name: 'POST /api/words',
      path: '/api/words',
      method: supertest(app).post,
    },
    {
      name: 'DELETE /api/words/:word_id',
      path: '/api/words/1',
      method: supertest(app).delete,
    },
    {
      name: 'PATCH /api/words/:word_id',
      path: '/api/words/1',
      method: supertest(app).patch,
    },
    {
      name: 'POST /api/definitions',
      path: '/api/definitions',
      method: supertest(app).post,
    },
    {
      name: 'DELETE /api/definitions/:word_id',
      path: '/api/definitions/1',
      method: supertest(app).delete,
    },
    {
      name: 'PATCH /api/definitions/:word_id',
      path: '/api/definitions/1',
      method: supertest(app).patch,
    },
  ]

  protectedEndpoints.forEach((endpoint) => {
    describe(endpoint.name, () => {
      it(`responds 401 'Missing bearer token' when no basic token`, () => {
        return endpoint
          .method(endpoint.path)
          .expect(401, { error: `Missing bearer token` })
      })

      it(`responds 401 'Unauthorized request' when invalid JWT secret`, () => {
        const validUser = testUsers[0]
        const invalidSecret = 'bad-secret'

        return endpoint
          .method(endpoint.path)
          .set('Authorization', makeAuthHeader(validUser, invalidSecret))
          .expect(401, { error: `Unauthorized request` })
      })

      it(`responds 401 'Unauthorized request' when invalid sub in payload`, () => {
        const invalidUser = {
          user_name: 'user-not',
          id: 1,
        }
        return endpoint
          .method(endpoint.path)
          .set('Authorization', makeAuthHeader(invalidUser))
          .expect(401, { error: `Unauthorized request` })
      })
    })
  })
})
