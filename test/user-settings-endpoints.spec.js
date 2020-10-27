const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')

const {
  makeAuthHeader,
  makeUserSettingsArray,
  makeDefinitionsFixtures,
  seedDefinitions,
  cleanTables,
} = require('./test-helpers')

describe('User-Settings Endpoints', function () {
  let db
  const { testUsers, testWords, testDefinitions } = makeDefinitionsFixtures()
  const testUser = testUsers[0]
  const settings = makeUserSettingsArray()

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
  describe('GET /api/users/:user_id/settings', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    it('responds with 200 and the settings', () => {
      const expectedSettings = settings.find((s) => s.user_id === testUser.id)

      return supertest(app)
        .get(`/api/users/${testUser.id}/settings`)
        .set('Authorization', makeAuthHeader(testUser))
        .expect(expectedSettings)
    })
  })

  //
  // PATCH ENDPOINT
  //
  describe('PATCH /api/users/:user_id/settings', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    it('responds with 204 and updates the settings', () => {
      const expectedSettings = settings.find((s) => s.user_id === testUser.id)

      const updatedSettings = {
        dark_mode: true,
      }

      return supertest(app)
        .patch(`/api/users/${testUser.id}/settings`)
        .set('Authorization', makeAuthHeader(testUser))
        .send(updatedSettings)
        .expect(204)
        .then(() =>
          supertest(app)
            .get(`/api/users/${testUser.id}/settings`)
            .set('Authorization', makeAuthHeader(testUser))
            .expect((res) => {
              expect(res.body.dark_mode).to.eql(updatedSettings.dark_mode)
              expect(res.body.user_id).to.eql(expectedSettings.user_id)
            })
        )
    })
  })
})
