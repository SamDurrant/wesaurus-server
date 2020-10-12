function makeWordsArray() {
  return [
    {
      id: 1,
      text: 'Boolean',
    },
    {
      id: 2,
      text: 'String',
    },
    {
      id: 3,
      text: 'Object',
    },
  ]
}

function makeMaliciousWord() {
  const maliciousWord = {
    id: 123,
    text: `wo<script>alert("xss");</script>rd <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">`,
  }
  const expectedWord = {
    id: 123,
    text: `wo&lt;script&gt;alert("xss");&lt;/script&gt;rd <img src="https://url.to.file.which/does-not.exist">`,
  }
  return {
    maliciousWord,
    expectedWord,
  }
}

function makeUsersArray() {
  return [
    {
      id: 1,
      user_name: 'test-user-1',
      email: 'testuser1@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      user_name: 'test-user-2',
      email: 'testuser2@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      user_name: 'test-user-3',
      email: 'testuser3@email.com',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ]
}

module.exports = {
  makeWordsArray,
  makeMaliciousWord,
  makeUsersArray,
}
