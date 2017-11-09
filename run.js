import serve from 'micro-core';
import api from './lib';

serve(api).listen(8080, (err) => {
  if (err) throw err;
  console.log('Listening on *:8080');
});
