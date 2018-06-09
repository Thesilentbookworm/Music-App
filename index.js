var express = require('express')
var logger = require('morgan')
var bodyParser = require('body-parser')
var request = require('request')// "Request" library
var cors = require('cors')
var querystring = require('querystring')
var cookieParser = require('cookie-parser')

var client_id = '89603cab108e4a20b0f6ed3e01b53139' // Your client id
var client_secret = 'f8968804776e4aab9b96bc0ddf579642' // Your secret
var redirect_uri = 'https://html-thesilentbookworm.c9users.io/callback' // Your redirect uri
var access_token = 'BQCZYdFRwrOUcynHmYIIYqHVhdz8nYoCnolBbkAbOBOhavLEFYHwJuPP4TM_tZVWx9dzrprAYtzjrqUYGW95kfae9hd13Y01EZH3cAET5EF5T48aetlVIkTZejfMiKEiF1cvBmZjUR36IIqqqgayEvdTeRX_0Slnk3zSsas05HDuXXcc5A'

var server = express()

server.use(logger('dev'))
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: false}))

server.set('view engine', 'ejs')
server.use(express.static('views'))
server.set('views', __dirname+'/views')

server.use(cors())
server.use(cookieParser())

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

var stateKey = 'spotify_auth_state'


server.get('/login', function(req, res) {

  var state = generateRandomString(16)
  res.cookie(stateKey, state)

  // your application requests authorization
  var scope = 'user-read-private user-read-email'
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }))
})

server.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var acc_token = body.access_token
        access_token = body.access_token
        
        var refresh_token = body.refresh_token

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + acc_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/home?' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

server.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

server.get('/', function(request, response){
    //response.send('<h1>Hello!</h1>')
    response.render('home.ejs')
})

server.get('/home', function(request, response){
    //response.send('<h1>Hello!</h1>')
    response.render('home.ejs')
})

server.get('/about', function(request, response) {
    response.render('about.ejs')
})

server.get('/portfolio', function(request, response) {
    response.render('portfolio.ejs')
})

server.get('/contact', function(request, response) {
    response.render('contact.ejs')
})

server.post('/', function(req, res){
    console.log(req.body)

    var options = {
      url: 'https://api.spotify.com/v1/search?q='+req.body.search+'&type='+req.body.choice,
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    }
   
    // use the access token to access the Spotify Web API
    request.get(options, function(error, response, body) {
      console.log(body)
    //   console.log(response)if (error) {
      if (req.body.choice === 'album') {
        res.render('album.ejs', {data: body})

      }
      
      if (req.body.choice === 'artist') {
        res.render('results.ejs', {data: body})
      }
      
      if (req.body.choice === 'playlist') {
        res.render('playlist.ejs', {data: body})

      }
      
      if (req.body.choice === 'track') {
          res.render('track.ejs', {data: body})
      }      
      
      // res.render('results.ejs', {data: body})
    })
})

var port = process.env.PORT

server.listen(port, () => {
    console.log('Server listening on port' +port)
})
