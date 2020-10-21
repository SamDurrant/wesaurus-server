const AuthService = require('../auth/auth-service')

function requireAuth(req, res, next) {
  // get auth headers
  const authToken = req.get('Authorization') || ''

  // check if bearer token present
  let bearerToken
  if (!authToken.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' })
  } else {
    bearerToken = authToken.slice(7, authToken.length)
  }
  try {
    // verify token
    const payload = AuthService.verifyJwt(bearerToken)

    // get user by user_name in payload
    AuthService.getUserWithUserName(req.app.get('db'), payload.sub)
      .then((user) => {
        // return unauthorized if no user by user_name
        if (!user)
          return res.status(401).json({ error: 'Unauthorized request' })
        req.user = user

        next()
      })
      .catch((err) => {
        console.error(err)
        next(err)
      })
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized request' })
  }
}

module.exports = {
  requireAuth,
}
