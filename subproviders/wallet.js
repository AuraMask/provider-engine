'use strict';

const inherits = require('util').inherits;
const HookedWalletIrcTxSubprovider = require('./hooked-wallet-irctx.js');

module.exports = WalletSubprovider;

inherits(WalletSubprovider, HookedWalletIrcTxSubprovider);

function WalletSubprovider(wallet, opts) {
  opts.getAccounts = function(cb) {
    cb(null, [wallet.getAddressString()]);
  };

  opts.getPrivateKey = function(address, cb) {
    if (address !== wallet.getAddressString()) {
      return cb('Account not found');
    }

    cb(null, wallet.getPrivateKey());
  };

  WalletSubprovider.super_.call(this, opts);
}
