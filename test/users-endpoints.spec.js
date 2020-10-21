const knex = require('knex')
const app = require('../src/app')
const supertest = require('supertest')
const bcrypt = require('bcryptjs')
const { expect } = require('chai')

const { makeUsersArray, seedUsers, cleanTables } = require('./test-helpers')

describe('Users Endpoints', function () {
  let db

  const testUsers = makeUsersArray()
  const testUser = testUsers[0]

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

  describe('POST /api/users', () => {
    context('user validation', () => {
      beforeEach('insert users', () => seedUsers(db, testUsers))

      const requiredFields = ['user_name', 'email', 'password']

      requiredFields.forEach((field) => {
        const registerAttemptBody = {
          user_name: 'test_user_name',
          email: 'testuser@test.com',
          password: 'ABC123abc!',
        }

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field]

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: {
                message: `Missing '${field}' in request body`,
              },
            })
        })
      })

      it(`responds 400 'Password must be longer than 8 characters' when empty password`, () => {
        const usersShortPassword = {
          user_name: 'test_user_name',
          email: 'testuser@test.com',
          password: 'Abc123!',
        }

        return supertest(app)
          .post('/api/users')
          .send(usersShortPassword)
          .expect(400, {
            error: {
              message: 'Password must be longer than 8 characters',
            },
          })
      })

      it(`responds 400 'Password must be less than 24 characters' when empty password`, () => {
        const usersLongPassword = {
          user_name: 'test_user_name',
          email: 'testuser@test.com',
          password: 'Abc123!'.repeat(5),
        }

        return supertest(app)
          .post('/api/users')
          .send(usersLongPassword)
          .expect(400, {
            error: {
              message: 'Password must be less than 24 characters',
            },
          })
      })

      it(`responds 400 error when password starts with spaces`, () => {
        const usersLongPassword = {
          user_name: 'test_user_name',
          email: 'testuser@test.com',
          password: '  Abc123abc!',
        }

        return supertest(app)
          .post('/api/users')
          .send(usersLongPassword)
          .expect(400, {
            error: {
              message: 'Password must not start or end with empty spaces',
            },
          })
      })

      it(`responds 400 error when password is not complex enough`, () => {
        const userSimplePassword = {
          user_name: 'test_user_name',
          email: 'testuser@test.com',
          password: 'abc123abc',
        }

        return supertest(app)
          .post('/api/users')
          .send(userSimplePassword)
          .expect(400, {
            error: {
              message:
                'Password must contain 1 upper case, lower case, number and special character',
            },
          })
      })

      it(`responds 400 error when email is invalid`, () => {
        const userInvalidEmail = {
          user_name: 'test_user_name',
          email: '.testuser@test.com',
          password: 'Abc123abc!',
        }

        return supertest(app)
          .post('/api/users')
          .send(userInvalidEmail)
          .expect(400, {
            error: {
              message: 'Email is invalid',
            },
          })
      })

      it(`responds 400 'Email already registered' when email is not unique`, () => {
        const userInvalidEmail = {
          user_name: 'test_user_name',
          email: testUser.email,
          password: 'Abc123abc!',
        }

        return supertest(app)
          .post('/api/users')
          .send(userInvalidEmail)
          .expect(400, {
            error: {
              message: 'A user is already registered with this email address',
            },
          })
      })

      it(`responds 400 'User name already taken' when user_name is not unique`, () => {
        const duplicateUser = {
          user_name: testUser.user_name,
          email: 'test_user@test.com',
          password: 'Abc123abc!',
        }

        return supertest(app)
          .post('/api/users')
          .send(duplicateUser)
          .expect(400, {
            error: {
              message: 'Username already taken',
            },
          })
      })
    })

    context('Happy path', () => {
      it(`responds 201, serialized user, storing bcrypted password`, () => {
        const newUser = {
          user_name: 'test_test',
          email: 'test_test@test.com',
          password: 'ABC123abc!',
        }

        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect((res) => {
            expect(res.body).to.have.property('id')
            expect(res.body.user_name).to.eql(newUser.user_name)
            expect(res.body.email).to.eql(newUser.email)
            expect(res.body).to.not.have.property('password')
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`)
            const expectedDate = new Date().toLocaleString('en', {
              timeZone: 'UTC',
            })
            const actualDate = new Date(res.body.date_created).toLocaleString()
            expect(actualDate).to.eql(expectedDate)
          })
          .expect((res) => {
            db.from('we_user')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then((row) => {
                expect(row.user_name).to.eql(newUser.user_name)
                expect(row.email).to.eql(newUser.email)
                const expectedDate = new Date().toLocaleString('en', {
                  timeZone: 'UTC',
                })
                const actualDate = new Date(row.date_created).toLocaleString()
                expect(actualDate).to.eql(expectedDate)
                return bcrypt.compare(newUser.password, row.password)
              })
              .then((compareMatch) => {
                expect(compareMatch).to.be.true
              })
          })
      })
    })
  })
})
