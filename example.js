const Webu = require('webu');
const BasicProvider = require('ethjs-provider-http');
const ProviderEngine = require('./index');
const createPayload = require('./util/create-payload.js');

var engine = new ProviderEngine({
  blockTrackerProvider: new BasicProvider('http://localhost:8545'),
});

engine.start();

// log new blocks
engine.on('latest', function(block) {
  console.log('===============================');
  console.log(`LATEST BLOCK: #${block}`);
  console.log('===============================');
  engine.stop();
});


// network connectivity error
engine.on('error', function(err) {
  // report connectivity errors
  console.error(err.stack);
});

// engine.sendAsync(createPayload({
//   method: 'irc_getBlock',
//   params: ['block'],
// }), (err, resp) => {
//   console.log(resp);
// });
