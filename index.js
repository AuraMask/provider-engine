const EventEmitter = require('events').EventEmitter;
const inherits = require('util').inherits;
const IrcUtil = require('icjs-util');
const IrcBlockTracker = require('irc-block-tracker');
const map = require('async/map');
const eachSeries = require('async/eachSeries');
const Stoplight = require('./util/stoplight.js');
const cacheUtils = require('./util/rpc-cache-utils.js');
const createPayload = require('./util/create-payload.js');

module.exports = WebuProviderEngine;

inherits(WebuProviderEngine, EventEmitter);

function WebuProviderEngine(opts) {
  // local state
  const self = this;
  self.currentBlock = null;
  self._providers = [];
  self._ready = new Stoplight();
  self.setMaxListeners(30);

  EventEmitter.call(self);

  // parse options
  opts = opts || {};

  // block polling
  const directProvider = {sendAsync: self._handleAsync.bind(self)};
  /**
   * @namespace opts.blockTrackerProvider
   * @namespace opts.blockTracker
   */
  const blockTrackerProvider = opts.blockTrackerProvider || directProvider;
  self._blockTracker = opts.blockTracker || new IrcBlockTracker({
    provider: blockTrackerProvider,
    pollingInterval: opts.pollingInterval || 4000,
  });

  // self._ready.go();
}

// public

WebuProviderEngine.prototype._syncBlock = function() {
  const self = this;
  self._blockTracker.on('latest', block => {
    self.currentBlock = block;
  });
};

WebuProviderEngine.prototype.start = function() {
  const self = this;
  if (!self._blockTracker.isRunning()) {
    self._blockTracker.on('sync', self.emit.bind(self, 'sync'));
    self._blockTracker.on('latest', self.emit.bind(self, 'latest'));
    self._ready.go();
  }
};

WebuProviderEngine.prototype.stop = function() {
  const self = this;
  if (self._blockTracker.isRunning()) {
    self._blockTracker.removeAllListeners();
    self._ready.stop();
  }
};

WebuProviderEngine.prototype.addProvider = function(source) {
  const self = this;
  self._providers.push(source);
  source.setEngine(this);
};

WebuProviderEngine.prototype.send = function(payload) {
  throw new Error('WebuProviderEngine does not support synchronous requests.');
};

WebuProviderEngine.prototype.sendAsync = function(payload, cb) {
  const self = this;
  self._ready.await(function() {

    if (Array.isArray(payload)) {
      // handle batch
      map(payload, self._handleAsync.bind(self), cb);
    } else {
      // handle single
      self._handleAsync(payload, cb);
    }

  });
};

// private

WebuProviderEngine.prototype._handleAsync = function(payload, finished) {
  var self = this;
  var currentProvider = -1;
  var result = null;
  var error = null;

  var stack = [];

  next();

  function next(after) {
    currentProvider += 1;
    stack.unshift(after);

    // Bubbled down as far as we could go, and the request wasn't
    // handled. Return an error.
    if (currentProvider >= self._providers.length) {
      end(new Error('Request for method "' + payload.method + '" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.'));
    } else {
      try {
        var provider = self._providers[currentProvider];
        provider.handleRequest(payload, next, end);
      } catch (e) {
        end(e);
      }
    }
  }

  function end(_error, _result) {
    error = _error;
    result = _result;

    eachSeries(stack, function(fn, callback) {

      if (fn) {
        fn(error, result, callback);
      } else {
        callback();
      }
    }, function() {
      // console.log('COMPLETED:', payload)
      // console.log('RESULT: ', result)

      var resultObj = {
        id: payload.id,
        jsonrpc: payload.jsonrpc,
        result: result,
      };

      if (error != null) {
        resultObj.error = {
          message: error.stack || error.message || error,
          code: -32000,
        };
        // respond with both error formats
        finished(error, resultObj);
      } else {
        finished(null, resultObj);
      }
    });
  }
};

// util

function toBufferBlock(jsonBlock) {
  return {
    number: IrcUtil.toBuffer(jsonBlock.number),
    hash: IrcUtil.toBuffer(jsonBlock.hash),
    parentHash: IrcUtil.toBuffer(jsonBlock.parentHash),
    nonce: IrcUtil.toBuffer(jsonBlock.nonce),
    sha3Uncles: IrcUtil.toBuffer(jsonBlock.sha3Uncles),
    logsBloom: IrcUtil.toBuffer(jsonBlock.logsBloom),
    transactionsRoot: IrcUtil.toBuffer(jsonBlock.transactionsRoot),
    stateRoot: IrcUtil.toBuffer(jsonBlock.stateRoot),
    receiptsRoot: IrcUtil.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner: IrcUtil.toBuffer(jsonBlock.miner),
    difficulty: IrcUtil.toBuffer(jsonBlock.difficulty),
    totalDifficulty: IrcUtil.toBuffer(jsonBlock.totalDifficulty),
    size: IrcUtil.toBuffer(jsonBlock.size),
    extraData: IrcUtil.toBuffer(jsonBlock.extraData),
    gasLimit: IrcUtil.toBuffer(jsonBlock.gasLimit),
    gasUsed: IrcUtil.toBuffer(jsonBlock.gasUsed),
    timestamp: IrcUtil.toBuffer(jsonBlock.timestamp),
    transactions: jsonBlock.transactions,
  };
}
