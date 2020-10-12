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

module.exports = {
  makeWordsArray,
  makeMaliciousWord,
}
