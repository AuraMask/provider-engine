const test = require('tape');
const async = require('async');
const ircUtil = require('icjs-util');
const ProviderEngine = require('../../index.js');
const VmSubprovider = require('../../subproviders/vm');
const TestBlockProvider = require('../util/block.js');
const RpcSubprovider = require('../../subproviders/rpc');
const createPayload = require('../../util/create-payload.js');
const rpcHexEncoding = require('../../util/rpc-hex-encoding.js');

test('binary search irc_estimateGas implementation', function(t) {
  var gasNeededScenarios = [
    {
      gasNeeded: 5,
      gasEstimate: 1150,
      numIterations: 12,
    },
    {
      gasNeeded: 50000,
      gasEstimate: 50046,
      numIterations: 13,
    },
    {
      gasNeeded: 4712387,
      gasEstimate: 4712387,
      numIterations: 23, // worst-case scenario
    },
  ];

  async.eachSeries(gasNeededScenarios, function(scenario, next) {
    var numIterations = 0;
    var engine = new ProviderEngine();
    var vmSubprovider = new VmSubprovider();
    // Stub runVm so that it behaves as if it needs gasNeeded to run and increments numIterations
    vmSubprovider.runVm = function(payload, cb) {
      numIterations++;
      if (payload.params[0].gas < scenario.gasNeeded) {
        cb(new Error('fake out of gas'));
      } else {
        cb(null, {gasUsed: ircUtil.toBuffer(scenario.gasNeeded)});
      }
    };
    engine.addProvider(vmSubprovider);
    engine.addProvider(new TestBlockProvider());
    engine.start();

    const payload = createPayload({
      method: 'irc_estimateGas',
      params: [{}, 'latest'],
    });

    const cb = (err, response) => {
      t.ifError(err, 'did not error');
      t.ok(response, 'has response');

      var gasEstimationInt = rpcHexEncoding.quantityHexToInt(response.result);
      t.equal(gasEstimationInt, scenario.gasEstimate, 'properly calculates gas needed');
      t.equal(numIterations, scenario.numIterations, 'ran expected number of iterations');

      engine.stop();
      next();
    };

    setTimeout(engine.sendAsync.bind(engine), 1000, payload, cb);
  }, function(err) {
    t.ifError(err, 'did not error');
    t.end();
  });
});
