/*
 * Uses icjs-tx to sign a transaction.
 *
 * The two callbacks a user needs to implement are:
 * - getAccounts() -- array of addresses supported
 * - getPrivateKey(address) -- return private key for a given address
 *
 * Optionally approveTransaction(), approveMessage() can be supplied too.
 */

const inherits = require('util').inherits;
const HookedWalletProvider = require('./hooked-wallet.js');
const IrcTx = require('icjs-tx');
const ircUtil = require('icjs-util');
const sigUtil = require('irc-sig-util');

module.exports = HookedWalletIrcTxSubprovider;

inherits(HookedWalletIrcTxSubprovider, HookedWalletProvider);

function HookedWalletIrcTxSubprovider(opts) {
  const self = this;

  HookedWalletIrcTxSubprovider.super_.call(self, opts);

  self.signTransaction = function(txData, cb) {
    // defaults
    if (txData.gas !== undefined) txData.gasLimit = txData.gas;
    txData.value = txData.value || '0x00';
    txData.data = ircUtil.addHexPrefix(txData.data);

    opts.getPrivateKey(txData.from, function(err, privateKey) {
      if (err) return cb(err);

      var tx = new IrcTx(txData);
      tx.sign(privateKey);
      cb(null, '0x' + tx.serialize().toString('hex'));
    });
  };

  self.signMessage = function(msgParams, cb) {
    opts.getPrivateKey(msgParams.from, function(err, privateKey) {
      if (err) return cb(err);
      var dataBuff = ircUtil.toBuffer(msgParams.data);
      var msgHash = ircUtil.hashPersonalMessage(dataBuff);
      var sig = ircUtil.ecsign(msgHash, privateKey);
      var serialized = ircUtil.bufferToHex(concatSig(sig.v, sig.r, sig.s));
      cb(null, serialized);
    });
  };

  self.signPersonalMessage = function(msgParams, cb) {
    opts.getPrivateKey(msgParams.from, function(err, privateKey) {
      if (err) return cb(err);
      const serialized = sigUtil.personalSign(privateKey, msgParams);
      cb(null, serialized);
    });
  };

  self.signTypedMessage = function(msgParams, cb) {
    opts.getPrivateKey(msgParams.from, function(err, privateKey) {
      if (err) return cb(err);
      const serialized = sigUtil.signTypedData(privateKey, msgParams);
      cb(null, serialized);
    });
  };

}

function concatSig(v, r, s) {
  r = ircUtil.fromSigned(r);
  s = ircUtil.fromSigned(s);
  v = ircUtil.bufferToInt(v);
  r = ircUtil.toUnsigned(r).toString('hex');
  s = ircUtil.toUnsigned(s).toString('hex');
  v = ircUtil.stripHexPrefix(ircUtil.intToHex(v));
  return ircUtil.addHexPrefix(r.concat(s, v).toString('hex'));
}
