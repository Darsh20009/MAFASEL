const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function setupPassport(app) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.log('Google OAuth: Missing credentials, skipping setup');
    return null;
  }

  let callbackURL;
  if (process.env.NODE_ENV === 'production') {
    callbackURL = process.env.GOOGLE_CALLBACK_URL || 'https://mafaseltech.com/api/auth/google/callback';
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    callbackURL = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  } else {
    callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
  }

  passport.use(new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL,
    proxy: true
  }, (accessToken, refreshToken, profile, done) => {
    done(null, profile);
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.use(passport.initialize());
  app.locals.passport = passport;

  console.log('Google OAuth configured successfully');
  console.log('Callback URL:', callbackURL);
  return passport;
}

module.exports = { setupPassport };
