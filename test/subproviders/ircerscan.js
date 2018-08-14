const sha3 = require('icjs-util').sha3;
const test = require('tape');
const ProviderEngine = require('../../index.js');
const createPayload = require('../../util/create-payload.js');
const IrcerscanSubprovider = require('../../subproviders/ircerscan');

// test('ircerscan irc_getBlockTransactionCountByNumber', function(t) {
//   t.plan(3);
//
//   var engine = new ProviderEngine();
//   var ircerscan = new IrcerscanSubprovider();
//   engine.addProvider(ircerscan);
//   engine.start();
//   engine.sendAsync(createPayload({
//     method: 'irc_getBlockTransactionCountByNumber',
//     params: [
//       '0x9',
//     ],
//   }), function(err, response) {
//     engine.stop();
//     t.ifError(err, 'throw no error');
//     t.ok(response, 'has response');
//     t.equal(response.result, '0x1');
//     t.end();
//   });
// });

test('ircerscan irc_getTransactionByHash', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider({https: true});
  engine.addProvider(ircerscan);
  engine.start();
  engine.sendAsync(createPayload({
    method: 'irc_getTransactionByHash',
    params: [
      '0xbe32baf102b5b4c6e505be32a24ac1244053fc3e89bc2fde34a55fee9ea663c4',
    ],
  }), function(err, response) {
    engine.stop();
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.equal(response.result.nonce, '0x2', 'nonce matches known nonce');
    t.end();
  });
});
//
// test('ircerscan irc_blockNumber', function(t) {
//   t.plan(3);
//
//   var engine = new ProviderEngine();
//   var ircerscan = new IrcerscanSubprovider();
//   engine.addProvider(ircerscan);
//   engine.start();
//   engine.sendAsync(createPayload({
//     method: 'irc_blockNumber',
//     params: [],
//   }), function(err, response) {
//     engine.stop();
//     t.ifError(err, 'throw no error');
//     t.ok(response, 'has response');
//     t.notEqual(response.result, '0x', 'block number does not equal 0x');
//     t.end();
//   });
// });
//
// test('ircerscan irc_getBlockByNumber', function(t) {
//   t.plan(3);
//
//   var engine = new ProviderEngine();
//   var ircerscan = new IrcerscanSubprovider();
//   engine.addProvider(ircerscan);
//   engine.start();
//   engine.sendAsync(createPayload({
//     method: 'irc_getBlockByNumber',
//     params: [
//       '0xa',
//       true,
//     ],
//   }), function(err, response) {
//     engine.stop();
//     t.ifError(err, 'throw no error');
//     t.ok(response, 'has response');
//     t.equal(response.result.nonce, '0x3b76d2038a7d6090', 'nonce matches known nonce');
//     t.end();
//   });
// });
//
// test('ircerscan irc_getBalance', function(t) {
//   t.plan(3);
//
//   var engine = new ProviderEngine();
//   var ircerscan = new IrcerscanSubprovider();
//   engine.addProvider(ircerscan);
//   engine.start();
//   engine.sendAsync(createPayload({
//     method: 'irc_getBalance',
//     params: [
//       '0xb3f1507591583ebf14b5b31d134d700c83c20fa1',
//       'latest',
//     ],
//   }), function(err, response) {
//     engine.stop();
//     t.ifError(err, 'throw no error');
//     t.ok(response, 'has response');
//     t.notEqual(response.result, '0', 'balance does not equal zero');
//     t.end();
//   });
// });
//
// test('ircerscan irc_call', function(t) {
//   t.plan(3);
//
//   var signature = Buffer.concat([sha3('founder()', 256)], 4).toString('hex');
//   var engine = new ProviderEngine();
//   var ircerscan = new IrcerscanSubprovider();
//   engine.addProvider(ircerscan);
//   engine.start();
//   engine.sendAsync(createPayload({
//     method: 'irc_call',
//     params: [
//       {
//         to: '0xf9563e522d1031fe2122b67607fd7f5094aad132',
//         data: signature,
//       },
//       'latest',
//     ],
//   }), function(err, response) {
//     engine.stop();
//     t.ifError(err, 'throw no error');
//     t.ok(response, 'has response');
//     t.equal(response.result, '0xb3f1507591583ebf14b5b31d134d700c83c20fa1', 'founder() match know founder()');
//     t.end();
//   });
// });
