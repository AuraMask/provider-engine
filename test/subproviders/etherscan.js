const sha3 = require('icjs-util').sha3;
const test = require('tape');
const ProviderEngine = require('../../index.js');
const createPayload = require('../../util/create-payload.js');
const IrcerscanSubprovider = require('../../subproviders/ircerscan');

test('ircerscan irc_getBlockTransactionCountByNumber', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_getBlockTransactionCountByNumber',
    params: [
      '0x132086',
    ],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.equal(response.result, '0x8');
    t.end();
  });
});

test('ircerscan irc_getTransactionByHash', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_getTransactionByHash',
    params: [
      '0xe420d77c4f8b5bf95021fa049b634d5e3f051752a14fb7c6a8f1333c37cdf817',
    ],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.equal(response.result.nonce, '0xd', 'nonce matches known nonce');
    t.end();
  });
});

test('ircerscan irc_blockNumber', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_blockNumber',
    params: [],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.notEqual(response.result, '0x', 'block number does not equal 0x');
    t.end();
  });
});

test('ircerscan irc_getBlockByNumber', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_getBlockByNumber',
    params: [
      '0x149a2a',
      true,
    ],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.equal(response.result.nonce, '0x80fdd9b71954f9fc', 'nonce matches known nonce');
    t.end();
  });
});

test('ircerscan irc_getBalance', function(t) {
  t.plan(3);

  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_getBalance',
    params: [
      '0xa601ea86ae7297e78a54f4b6937fbc222b9d87f4',
      'latest',
    ],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.notEqual(response.result, '0', 'balance does not equal zero');
    t.end();
  });
});

test('ircerscan irc_call', function(t) {
  t.plan(3);

  var signature = Buffer.concat([sha3('getLatestBlock()', 256)], 4).toString('hex');
  var engine = new ProviderEngine();
  var ircerscan = new IrcerscanSubprovider();
  engine.addProvider(ircerscan);
  engine.sendAsync(createPayload({
    method: 'irc_call',
    params: [
      {
        to: '0x4EECf99D543B278106ac0c0e8ffe616F2137f10a',
        data: signature,
      },
      'latest',
    ],
  }), function(err, response) {
    t.ifError(err, 'throw no error');
    t.ok(response, 'has response');
    t.notEqual(response.result, '0x', 'irc_call to getLatestBlock() does not equal 0x');
    t.end();
  });
});
