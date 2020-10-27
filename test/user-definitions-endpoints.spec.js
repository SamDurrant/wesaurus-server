const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const { expect } = require('chai')

const {
  makeMaliciousDefinition,
  makeAuthHeader,
  makeDefinitionsFixtures,
  seedDefinitions,
  makeUserDefinitionsArray,
  seedUserDefinitions,
  cleanTables,
  makeExpectedUserDefinitionsArray,
} = require('./test-helpers')

describe.only('User-Definitions Endpoints', function () {
  let db
  const { testUsers, testWords, testDefinitions } = makeDefinitionsFixtures()
  const testUserDefinitions = makeUserDefinitionsArray()
  const testUser = testUsers[0]
  const expectedUserDefinitions = makeExpectedUserDefinitionsArray(
    testUserDefinitions,
    testDefinitions
  )

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
  describe('GET /api/users/:user_id/definitions', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context('Given no user definitions', () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, [])
      })
    })

    context(`Given there are user definitions`, () => {
      beforeEach('insert user definitions', () =>
        seedUserDefinitions(db, testUserDefinitions)
      )

      it(`responds with 200 and all of the definitions`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(expectedUserDefinitions)
      })
    })

    context(`Given XSS attack content`, () => {
      const {
        maliciousDefinition,
        expectedDefinition,
      } = makeMaliciousDefinition(testUser, testWords[0])

      beforeEach('insert malicious definition', () => {
        return db
          .insert([maliciousDefinition])
          .into('definition')
          .then(() =>
            db
              .insert([
                { user_id: testUser.id, definition_id: maliciousDefinition.id },
              ])
              .into('saved_definition')
          )
      })

      it(`removes XSS attack context`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200)
          .expect((res) => {
            expect(res.body[0].text).to.eql(expectedDefinition.text)
            expect(res.body[0].id).to.eql(expectedDefinition.id)
          })
      })
    })
  })

  //
  // POST ENDPOINT
  //
  describe(`POST /api/users/:user_id/definitions`, () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context(`Given the definition does not exist at all`, () => {
      const newDef = { definition_id: 201 }

      it(`responds with 404 does not exist`, () => {
        return supertest(app)
          .post(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newDef)
          .expect(404, {
            error: {
              message: 'This definition does not exist',
            },
          })
      })
    })

    context(`Given the definition already exists in user's dictionary`, () => {
      beforeEach('insert user definitions', () =>
        seedUserDefinitions(db, testUserDefinitions)
      )
      const newDef = {
        definition_id: testUserDefinitions[0].definition_id,
      }

      it(`responds with 400 already exists`, () => {
        return supertest(app)
          .post(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newDef)
          .expect(400, {
            error: {
              message: 'Definition already exists in your dictionary',
            },
          })
      })
    })

    context(`Given the definition does not exist in user's dictionary`, () => {
      const newDefinition = { definition_id: testDefinitions[2].id }

      it(`adds the definition, responding with 201 and the new definition`, () => {
        return supertest(app)
          .post(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newDefinition)
          .expect(201)
          .expect((res) => {
            expect(res.body).to.have.property('id')
            expect(res.body.text).to.eql(testDefinitions[2].text)
            expect(res.headers.location).to.eql(
              `/api/users/${testUser.id}/definitions/${res.body.id}`
            )
          })
          .expect((res) => {
            db.from('definition')
              .where({ id: res.body.id })
              .first()
              .then((row) => {
                expect(row.text).to.eql(testDefinitions[2].text)
              })
          })
      })
    })

    const requiredFields = ['definition_id']

    requiredFields.forEach((field) => {
      const newDef = {
        definition_id: testDefinitions[2].id,
      }

      it(`responds with 400 and an error message when the '${field} is missing`, () => {
        delete newDef[field]

        return supertest(app)
          .post(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .send(newDef)
          .expect(400, {
            error: {
              message: `Missing '${field}' in request body`,
            },
          })
      })
    })

    context(`Given XSS attack content`, () => {
      const {
        maliciousDefinition,
        expectedDefinition,
      } = makeMaliciousDefinition(testUser, testWords[0])

      beforeEach('insert malicious definition', () => {
        return db
          .insert([maliciousDefinition])
          .into('definition')
          .then(() =>
            db
              .insert([
                { user_id: testUser.id, definition_id: maliciousDefinition.id },
              ])
              .into('saved_definition')
          )
      })

      it(`removes XSS attack context`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200)
          .expect((res) => {
            expect(res.body[0].text).to.eql(expectedDefinition.text)
            expect(res.body[0].id).to.eql(expectedDefinition.id)
          })
      })
    })
  })

  //
  // GET SPECIFIC ENDPOINT
  //
  describe('GET /api/users/:user_id/definitions/:definition_id', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context(`Given no user definitions`, () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions/1`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(404, {
            error: {
              message: `This definition does not exist in your dictionary`,
            },
          })
      })
    })

    context('Given there are user definitions', () => {
      beforeEach('insert user definitions', () =>
        seedUserDefinitions(db, testUserDefinitions)
      )
      const defId = testUserDefinitions[0].definition_id
      const expectedDef = expectedUserDefinitions.find((d) => d.id === defId)

      it('responds with 200 and the definition', () => {
        return supertest(app)
          .get(`/api/users/${testUser.id}/definitions/${defId}`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, expectedDef)
      })
    })
  })

  //
  // DELETE SPECIFIC ENDPOINT
  //
  describe('DELETE /api/users/:user_id/definitions/:definition_id', () => {
    beforeEach('insert users, words & definitions', () =>
      seedDefinitions(db, testUsers, testWords, testDefinitions)
    )

    context(`Given no user definitions`, () => {
      it(`responds with 404`, () => {
        return supertest(app)
          .delete(`/api/users/${testUser.id}/definitions/1`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(404, {
            error: {
              message: `This definition does not exist in your dictionary`,
            },
          })
      })
    })

    context('Given there are user definitions', () => {
      beforeEach('insert user definitions', () =>
        seedUserDefinitions(db, testUserDefinitions)
      )
      const defId = testUserDefinitions[0].definition_id
      const expectedDefs = expectedUserDefinitions.filter((d) => d.id !== defId)

      it('responds with 204 and removes the definition', () => {
        return supertest(app)
          .delete(`/api/users/${testUser.id}/definitions/${defId}`)
          .set('Authorization', makeAuthHeader(testUser))
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/users/${testUser.id}/definitions`)
              .set('Authorization', makeAuthHeader(testUser))
              .expect(expectedDefs)
          )
      })
    })
  })
})
