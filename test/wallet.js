const test = require('tape');
const Transaction = require('icjs-tx');
const ethUtil = require('icjs-util');
const ProviderEngine = require('../index.js');
const FixtureProvider = require('../subproviders/fixture.js');
const NonceTracker = require('../subproviders/nonce-tracker.js');
const HookedWalletProvider = require('../subproviders/hooked-wallet.js');
const HookedWalletTxProvider = require('../subproviders/hooked-wallet-irctx.js');
const TestBlockProvider = require('./util/block.js');
const createPayload = require('../util/create-payload.js');
const injectMetrics = require('./util/inject-metrics');

test('tx sig', function(t) {
  t.plan(12);

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex');
  var address = new Buffer('1234362ef32bcd26d3dd18ca749378213625ba0b', 'hex');
  var addressHex = '0x' + address.toString('hex');

  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb) {
      cb(null, [addressHex]);
    },
    signTransaction: function(txParams, cb) {
      var tx = new Transaction(txParams);
      tx.sign(privateKey);
      var rawTx = '0x' + tx.serialize().toString('hex');
      cb(null, rawTx);
    },
  }));

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker());
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    irc_gasPrice: '0x1234',
    irc_getTransactionCount: '0x00',
    irc_sendRawTransaction: function(payload, next, done) {
      var rawTx = ethUtil.toBuffer(payload.params[0]);
      var tx = new Transaction(rawTx);
      var hash = '0x' + tx.hash().toString('hex');
      done(null, hash);
    },
  }));
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider());

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(providerB);
  engine.addProvider(providerC);
  engine.addProvider(providerD);
  engine.start();

  var txPayload = {
    method: 'irc_sendTransaction',
    params: [
      {
        from: addressHex,
        to: addressHex,
        value: '0x01',
        gas: '0x1234567890',
      }],
  };

  engine.sendAsync(createPayload(txPayload), function(err, response) {
    t.ifError(err, 'did not error');
    t.ok(response, 'has response');

    // intial tx request
    t.equal(providerA.getWitnessed('irc_sendTransaction').length, 1, 'providerA did see "signTransaction"');
    t.equal(providerA.getHandled('irc_sendTransaction').length, 1, 'providerA did handle "signTransaction"');

    // tx nonce
    t.equal(providerB.getWitnessed('irc_getTransactionCount').length, 1, 'providerB did see "irc_getTransactionCount"');
    t.equal(providerB.getHandled('irc_getTransactionCount').length, 0, 'providerB did NOT handle "irc_getTransactionCount"');
    t.equal(providerC.getWitnessed('irc_getTransactionCount').length, 1, 'providerC did see "irc_getTransactionCount"');
    t.equal(providerC.getHandled('irc_getTransactionCount').length, 1, 'providerC did handle "irc_getTransactionCount"');

    // gas price
    t.equal(providerC.getWitnessed('irc_gasPrice').length, 1, 'providerB did see "irc_gasPrice"');
    t.equal(providerC.getHandled('irc_gasPrice').length, 1, 'providerB did handle "irc_gasPrice"');

    // send raw tx
    t.equal(providerC.getWitnessed('irc_sendRawTransaction').length, 1, 'providerC did see "irc_sendRawTransaction"');
    t.equal(providerC.getHandled('irc_sendRawTransaction').length, 1, 'providerC did handle "irc_sendRawTransaction"');

    engine.stop();
    t.end();
  });

});

test('no such account', function(t) {
  t.plan(1);

  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b';
  var otherAddressHex = '0x4321362ef32bcd26d3dd18ca749378213625ba0c';

  // sign all tx's
  var providerA = injectMetrics(new HookedWalletProvider({
    getAccounts: function(cb) {
      cb(null, [addressHex]);
    },
  }));

  // handle nonce requests
  var providerB = injectMetrics(new NonceTracker());
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    irc_gasPrice: '0x1234',
    irc_getTransactionCount: '0x00',
    irc_sendRawTransaction: function(payload, next, done) {
      var rawTx = ethUtil.toBuffer(payload.params[0]);
      var tx = new Transaction(rawTx);
      var hash = '0x' + tx.hash().toString('hex');
      done(null, hash);
    },
  }));
  // handle block requests
  var providerD = injectMetrics(new TestBlockProvider());

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(providerB);
  engine.addProvider(providerC);
  engine.addProvider(providerD);
  engine.start();

  var txPayload = {
    method: 'irc_sendTransaction',
    params: [
      {
        from: otherAddressHex,
        to: addressHex,
        value: '0x01',
        gas: '0x1234567890',
      }],
  };

  engine.sendAsync(createPayload(txPayload), function(err, response) {
    t.ok(err, 'did error');

    engine.stop();
    t.end();
  });

});

test('sign message', function(t) {
  t.plan(3);

  var privateKey = new Buffer('cccd8f4d88de61f92f3747e4a9604a0395e6ad5138add4bec4a2ddf231ee24f9', 'hex');
  var addressHex = '0x1234362ef32bcd26d3dd18ca749378213625ba0b';

  var message = 'haay wuurl';
  var signature = '0xadb0f050beabd6fd6b9e5f902e03108de25682932afdfc6009f4c1ea9fe6e71815aff418de1a2ce1703cc51c4d7d4bb29ee32090d40cf5f3ebda051e9233f11e1b';

  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb) {
      cb(null, [addressHex]);
    },
    getPrivateKey: function(address, cb) {
      cb(null, privateKey);
    },
  }));

  // handle block requests
  var providerB = injectMetrics(new TestBlockProvider());

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(providerB);
  engine.start();

  var payload = {
    method: 'irc_sign',
    params: [
      addressHex,
      message,
    ],
  };

  engine.sendAsync(createPayload(payload), function(err, response) {
    t.ifError(err, 'did not error');
    t.ok(response, 'has response');

    t.equal(response.result, signature, 'signed response is correct');

    engine.stop();
    t.end();
  });

});
//
// personal_sign was declared without an explicit set of test data
// so I made a script out of geth's internals to create this test data
// https://gist.github.com/kumavis/461d2c0e9a04ea0818e423bb77e3d260

signatureTest({
  testLabel: 'kumavis fml manual test I',
  method: 'personal_sign',
  // "hello world"
  message: '0x68656c6c6f20776f726c64',
  signature: '0xf32832a84f9c60c2b20ecd0650f3fdb6fab3447ffc8a53c4234b58b90e82a24b1dfe2931f4b18b58aac1b21e69e19a1e35a510f37ac23c5c4dddac38805113e01c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
});

signatureTest({
  testLabel: 'kumavis fml manual test II',
  method: 'personal_sign',
  // some random binary message from parity's test
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x4bfd8ce65ad740403e745fad70ba978d6ab01d18920ef7794b22321a5b86dcae206af1468fffbb41ea514377d868b9c354c88bcf0c1864ee1ac96713d7d966fb1b',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
});

signatureTest({
  testLabel: 'kumavis fml manual test III',
  method: 'personal_sign',
  // random binary message data and pk from parity's test
  // https://github.com/ethcore/parity/blob/5369a129ae276d38f3490abb18c5093b338246e0/rpc/src/v1/tests/mocked/eth.rs#L301-L317
  // note: their signature result is incorrect (last byte moved to front) due to a parity bug
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x7986678d61b74f7a17e477fe291f6867d2426fc537ac3b74f60dfdc8cbd106006b40342133e56d5f89f27ba5c7dbce980f8e48ab276cffc0d6352a79ff8dbd741c',
  addressHex: '0xe0da1edcea030875cd0f199d96eb70f6ab78faf2',
  privateKey: new Buffer('4545454545454545454545454545454545454545454545454545454545454545', 'hex'),
});

recoverTest({
  testLabel: 'geth kumavis manual I recover',
  method: 'personal_ecRecover',
  // "hello world"
  message: '0x68656c6c6f20776f726c64',
  signature: '0xf32832a84f9c60c2b20ecd0650f3fdb6fab3447ffc8a53c4234b58b90e82a24b1dfe2931f4b18b58aac1b21e69e19a1e35a510f37ac23c5c4dddac38805113e01c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
});

recoverTest({
  testLabel: 'geth kumavis manual II recover',
  method: 'personal_ecRecover',
  // message from parity's test - note result is different than what they are testing against
  // https://github.com/ethcore/parity/blob/5369a129ae276d38f3490abb18c5093b338246e0/rpc/src/v1/tests/mocked/eth.rs#L301-L317
  message: '0x0cc175b9c0f1b6a831c399e26977266192eb5ffee6ae2fec3ad71c777531578f',
  signature: '0x4bfd8ce65ad740403e745fad70ba978d6ab01d18920ef7794b22321a5b86dcae206af1468fffbb41ea514377d868b9c354c88bcf0c1864ee1ac96713d7d966fb1b',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
});

signatureTest({
  testLabel: 'sign typed message',
  method: 'irc_signTypedData',
  message: [
    {
      type: 'string',
      name: 'message',
      value: 'Hi, Alice!',
    },
  ],
  signature: '0xb2c9c7bdaee2cc73f318647c3f6e24792fca86a9f2736d9e7537e64c503545392313ebbbcb623c828fd8f99fd1fb48f8f4da8cb1d1a924e28b21de018c826e181c',
  addressHex: '0xbe93f9bacbcffc8ee6663f2647917ed7a20a57bb',
  privateKey: new Buffer('6969696969696969696969696969696969696969696969696969696969696969', 'hex'),
});

test('sender validation, with mixed-case', function(t) {
  t.plan(1);

  var senderAddress = '0xE4660fdAb2D6Bd8b50C029ec79E244d132c3bc2B';

  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb) {
      cb(null, [senderAddress]);
    },
    getPrivateKey: function(address, cb) {
      t.pass('correctly validated sender');
      engine.stop();
      t.end();
    },
  }));
  var providerB = injectMetrics(new TestBlockProvider());
  // handle all bottom requests
  var providerC = injectMetrics(new FixtureProvider({
    irc_gasPrice: '0x1234',
    irc_estimateGas: '0x1234',
    irc_getTransactionCount: '0x00',
  }));

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(providerB);
  engine.addProvider(providerC);

  engine.sendAsync({
    method: 'irc_sendTransaction',
    params: [
      {
        from: senderAddress.toLowerCase(),
      }],
  }, function(err) {
    t.notOk(err, 'error was present');
    engine.stop();
    t.end();
  });

});

function signatureTest({testLabel, method, privateKey, addressHex, message, signature}) {
  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb) {
      cb(null, [addressHex]);
    },
    getPrivateKey: function(address, cb) {
      cb(null, privateKey);
    },
  }));

  // handle block requests
  var providerB = injectMetrics(new TestBlockProvider());

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(providerB);

  var payload = {
    method: method,
    params: [message, addressHex],
  };

  singleRpcTest({
    testLabel: `sign message ${method} - ${testLabel}`,
    payload,
    engine,
    expectedResult: signature,
  });

  // Personal sign is supposed to have params ordered in this direction, not the other.
  if (payload.method === 'personal_sign') {
    singleRpcTest({
      testLabel: `sign message ${method} - ${testLabel}`,
      payload,
      engine,
      expectedResult: signature,
    });
  }
}

function recoverTest({testLabel, method, addressHex, message, signature}) {

  // sign all messages
  var providerA = injectMetrics(new HookedWalletTxProvider({
    getAccounts: function(cb) {
      cb(null, [addressHex]);
    },
    getPrivateKey: function(address, cb) {
      cb(null, privateKey);
    },
  }));

  // handle block requests
  var blockProvider = injectMetrics(new TestBlockProvider());

  var engine = new ProviderEngine();
  engine.addProvider(providerA);
  engine.addProvider(blockProvider);

  var payload = {
    method: method,
    params: [message, signature],
  };

  singleRpcTest({
    testLabel: `recover message ${method} - ${testLabel}`,
    payload,
    engine,
    expectedResult: addressHex,
  });

}

function singleRpcTest({testLabel, payload, expectedResult, engine}) {
  test(testLabel, function(t) {
    t.plan(3);

    engine.start();
    engine.sendAsync(createPayload(payload), function(err, response) {
      if (err) {
        console.log('bad payload:', payload);
        console.error(err);
      }
      t.ifError(err);
      t.ok(response, 'has response');

      t.equal(response.result, expectedResult, 'rpc result is as expected');

      engine.stop();
      t.end();
    });

  });
}
