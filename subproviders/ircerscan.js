const xhr = process.browser ? require('xhr') : require('request');
const inherits = require('util').inherits;
const Subprovider = require('./subprovider.js');

module.exports = IrcerscanProvider;

inherits(IrcerscanProvider, Subprovider);

function IrcerscanProvider(opts) {
  opts = opts || {};
  this.network = opts.network || 'scan';
  this.proto = opts.https ? 'https' : 'http';
  this.requests = [];
  this.times = isNaN(opts.times) ? 4 : opts.times;
  this.interval = isNaN(opts.interval) ? 1000 : opts.interval;
  this.retryFailed = typeof opts.retryFailed === 'boolean' ? opts.retryFailed : true; // not built yet

  setInterval(this.handleRequests, this.interval, this);
}

IrcerscanProvider.prototype.handleRequests = function(self) {
  if (self.requests.length === 0) return;

  //console.log('Handling the next ' + self.times + ' of ' + self.requests.length + ' requests');

  for (var requestIndex = 0; requestIndex < self.times; requestIndex++) {
    var requestItem = self.requests.shift();

    if (typeof requestItem !== 'undefined')
      handlePayload(requestItem.proto, requestItem.network, requestItem.payload, requestItem.next, requestItem.end);
  }
};

IrcerscanProvider.prototype.handleRequest = function(payload, next, end) {
  var requestObject = {proto: this.proto, network: this.network, payload: payload, next: next, end: end},
      self = this;

  if (this.retryFailed)
    requestObject.end = function(err, result) {
      if (err === '403 - Forbidden: Access is denied.')
        self.requests.push(requestObject);
      else
        end(err, result);
    };

  this.requests.push(requestObject);
};

function handlePayload(proto, network, payload, next, end) {
  switch (payload.method) {
    case 'irc_blockNumber':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_blockNumber', {}, end);
      return;

    case 'irc_getBlockByNumber':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getBlockByNumber', {
        tag: payload.params[0],
        boolean: payload.params[1],
      }, end);
      return;

    case 'irc_getBlockTransactionCountByNumber':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getBlockTransactionCountByNumber', {
        tag: payload.params[0],
      }, end);
      return;

    case 'irc_getTransactionByHash':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getTransactionByHash', {
        txhash: payload.params[0],
      }, end);
      return;

    case 'irc_getBalance':
      ircerscanXHR(true, proto, network, 'account', 'balance', {
        address: payload.params[0],
        tag: payload.params[1],
      }, end);
      return;

    case 'irc_listTransactions':
      const props = [
        'address',
        'startblock',
        'endblock',
        'sort',
        'page',
        'offset',
      ];

      const params = {};
      for (let i = 0, l = Math.min(payload.params.length, props.length); i < l; i++) {
        params[props[i]] = payload.params[i];
      }

      ircerscanXHR(true, proto, network, 'account', 'txlist', params, end);
      return;

    case 'irc_call':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_call', payload.params[0], end);
      return;

    case 'irc_sendRawTransaction':
      ircerscanXHR(false, proto, network, 'proxy', 'irc_sendRawTransaction', {hex: payload.params[0]}, end);
      return;

    case 'irc_getTransactionReceipt':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getTransactionReceipt', {txhash: payload.params[0]}, end);
      return;

      // note !! this does not support topic filtering yet, it will return all block logs
    case 'irc_getLogs':
      var payloadObject = payload.params[0],
          txProcessed = 0,
          logs = [];

      ircerscanXHR(true, proto, network, 'proxy', 'irc_getBlockByNumber', {
        tag: payloadObject.toBlock,
        boolean: payload.params[1],
      }, function(err, blockResult) {
        if (err) return end(err);

        for (var transaction in blockResult.transactions) {
          ircerscanXHR(
              true,
              proto,
              network,
              'proxy',
              'irc_getTransactionReceipt',
              {txhash: transaction.hash},
              function(err, receiptResult) {
                if (!err) logs.concat(receiptResult.logs);
                txProcessed += 1;
                if (txProcessed === blockResult.transactions.length) end(null, logs);
              });
        }
      });
      return;

    case 'irc_getTransactionCount':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getTransactionCount', {
        address: payload.params[0],
        tag: payload.params[1],
      }, end);
      return;

    case 'irc_getCode':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getCode', {
        address: payload.params[0],
        tag: payload.params[1],
      }, end);
      return;

    case 'irc_getStorageAt':
      ircerscanXHR(true, proto, network, 'proxy', 'irc_getStorageAt', {
        address: payload.params[0],
        position: payload.params[1],
        tag: payload.params[2],
      }, end);
      return;

    default:
      next();
      return;
  }
}

function toQueryString(params) {
  return Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
}

function ircerscanXHR(useGetMethod, proto, network, module, action, params, end) {
  var uri = proto + '://' + network + '.ircerscan.io/api/' + toQueryString({module: module, action: action}) + '&' + toQueryString(params);
  console.log(uri);
  xhr({
    uri: uri,
    method: useGetMethod ? 'GET' : 'POST',
    headers: {
      'Accept': 'application/json',
      // 'Content-Type': 'application/json',
    },
    rejectUnauthorized: false,
  }, function(err, res, body) {
    // console.log('[ircerscan] response: ', err)

    if (err) return end(err);

    /*console.log('[ircerscan request]'
          + ' method: ' + useGetMethod
          + ' proto: ' + proto
          + ' network: ' + network
          + ' module: ' + module
          + ' action: ' + action
          + ' params: ' + params
          + ' return body: ' + body);*/

    if (body.indexOf('403 - Forbidden: Access is denied.') > -1)
      return end('403 - Forbidden: Access is denied.');

    var data;
    try {
      data = JSON.parse(body);
    } catch (err) {
      console.error(err.stack);
      return end(err);
    }

    // console.log('[ircerscan] response decoded: ', data)

    // NOTE: or use id === -1? (id=1 is 'success')
    if ((module === 'proxy') && data.error) {
      // Maybe send back the code too?
      return end(data.error.message);
    }

    // NOTE: or data.status !== 1?
    if ((module === 'account') && (data.message !== 'OK')) {
      return end(data.message);
    }

    end(null, data.result);
  });
}
