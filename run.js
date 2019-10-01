const serve = require('micro-core').default;
const api = require('./dist/').default;

serve(api).listen(8080, (err) => {
  if (err) throw err;
  console.log('Listening on *:8080');
});
