const inherits = require('util').inherits;
const Subprovider = require('./subprovider.js');

module.exports = WhitelistProvider;

inherits(WhitelistProvider, Subprovider);

function WhitelistProvider(methods) {
  this.methods = methods;

  if (this.methods == null) {
    this.methods = [
      'irc_gasPrice',
      'irc_blockNumber',
      'irc_getBalance',
      'irc_getBlockByHash',
      'irc_getBlockByNumber',
      'irc_getBlockTransactionCountByHash',
      'irc_getBlockTransactionCountByNumber',
      'irc_getCode',
      'irc_getStorageAt',
      'irc_getTransactionByBlockHashAndIndex',
      'irc_getTransactionByBlockNumberAndIndex',
      'irc_getTransactionByHash',
      'irc_getTransactionCount',
      'irc_getTransactionReceipt',
      'irc_getUncleByBlockHashAndIndex',
      'irc_getUncleByBlockNumberAndIndex',
      'irc_getUncleCountByBlockHash',
      'irc_getUncleCountByBlockNumber',
      'irc_sendRawTransaction',
      'irc_getLogs',
    ];
  }
}

WhitelistProvider.prototype.handleRequest = function(payload, next, end) {
  if (this.methods.indexOf(payload.method) >= 0) {
    next();
  } else {
    end(new Error('Method \'' + payload.method + '\' not allowed in whitelist.'));
  }
};
