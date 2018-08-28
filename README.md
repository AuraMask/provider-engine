# Webu ProviderEngine [![CircleCI](https://circleci.com/gh/AuraMask/provider-engine.svg?style=svg)](https://circleci.com/gh/AuraMask/provider-engine)

Webu ProviderEngine is a tool for composing your own [webu providers](https://github.com/irchain/wiki/wiki/JavaScript-API#webu).


### Composable

Built to be modular - works via a stack of 'sub-providers' which are like normal webu providers but only handle a subset of rpc methods.

The subproviders can emit new rpc requests in order to handle their own;  e.g. `irc_call` may trigger `irc_getAccountBalance`, `irc_getCode`, and others.
The provider engine also handles caching of rpc request results.

```js
const ProviderEngine = require('webu-provider-engine')
const CacheSubprovider = require('webu-provider-engine/subproviders/cache.js')
const FixtureSubprovider = require('webu-provider-engine/subproviders/fixture.js')
const FilterSubprovider = require('webu-provider-engine/subproviders/filters.js')
const VmSubprovider = require('webu-provider-engine/subproviders/vm.js')
const HookedWalletSubprovider = require('webu-provider-engine/subproviders/hooked-wallet.js')
const NonceSubprovider = require('webu-provider-engine/subproviders/nonce-tracker.js')
const RpcSubprovider = require('webu-provider-engine/subproviders/rpc.js')

var engine = new ProviderEngine()
var webu = new Webu(engine)

// static results
engine.addProvider(new FixtureSubprovider({
  webu_clientVersion: 'ProviderEngine/v0.0.0/javascript',
  net_listening: true,
  irc_hashrate: '0x00',
  irc_mining: false,
  irc_syncing: true,
}))

// cache layer
engine.addProvider(new CacheSubprovider())

// filters
engine.addProvider(new FilterSubprovider())

// pending nonce
engine.addProvider(new NonceSubprovider())

// vm
engine.addProvider(new VmSubprovider())

// id mgmt
engine.addProvider(new HookedWalletSubprovider({
  getAccounts: function(cb){ ... },
  approveTransaction: function(cb){ ... },
  signTransaction: function(cb){ ... },
}))

// data source
engine.addProvider(new RpcSubprovider({
  rpcUrl: 'https://testrpc.metamask.io/',
}))

// log new blocks
engine.on('latest', function(block){
  console.log('================================')
  console.log('BLOCK CHANGED:', '#'+block.toString('hex'), '0x'+block.hash.toString('hex'))
  console.log('================================')
})

// network connectivity error
engine.on('error', function(err){
  // report connectivity errors
  console.error(err.stack)
})

```

When importing in webpack:
```js
import * as WebuProviderEngine  from 'webu-provider-engine';
import * as RpcSource  from 'webu-provider-engine/subproviders/rpc';
import * as HookedWalletSubprovider from 'webu-provider-engine/subproviders/hooked-wallet';
```

### Built For Zero-Clients

The [IrChain JSON RPC](https://github.com/ethereum/wiki/wiki/JSON-RPC) was not designed to have one node service many clients.
However a smaller, lighter subset of the JSON RPC can be used to provide the blockchain data that an IrChain 'zero-client' node would need to function.
We handle as many types of requests locally as possible, and just let data lookups fallback to some data source ( hosted rpc, blockchain api, etc ).
Categorically, we don’t want / can’t have the following types of RPC calls go to the network:
* id mgmt + tx signing (requires private data)
* filters (requires a stateful data api)
* vm (expensive, hard to scale)

### Current RPC method support:

##### static
- [x] webu_clientVersion
- [x] net_version
- [x] net_listening
- [x] net_peerCount
- [x] irc_protocolVersion
- [x] irc_hashrate
- [x] irc_mining
- [x] irc_syncing

##### filters
- [x] irc_newBlockFilter
- [x] irc_newPendingTransactionFilter
- [x] irc_newFilter
- [x] irc_uninstallFilter
- [x] irc_getFilterLogs
- [x] irc_getFilterChanges

##### accounts manager
- [x] irc_coinbase
- [x] irc_accounts
- [x] irc_sendTransaction
- [x] irc_sign
- [x] [irc_signTypedData](https://github.com/ethereum/EIPs/pull/712)

##### vm
- [x] irc_call
- [x] irc_estimateGas

##### db source
- [ ] db_putString
- [ ] db_getString
- [ ] db_putHex
- [ ] db_getHex

##### compiler
- [ ] irc_getCompilers
- [ ] irc_compileLLL
- [ ] irc_compileSerpent
- [ ] irc_compileSolidity

##### shh gateway
- [ ] shh_version
- [ ] shh_post
- [ ] shh_newIdentity
- [ ] shh_hasIdentity
- [ ] shh_newGroup
- [ ] shh_addToGroup

##### data source ( fallback to rpc )
* irc_gasPrice
* irc_blockNumber
* irc_getBalance
* irc_getBlockByHash
* irc_getBlockByNumber
* irc_getBlockTransactionCountByHash
* irc_getBlockTransactionCountByNumber
* irc_getCode
* irc_getStorageAt
* irc_getTransactionByBlockHashAndIndex
* irc_getTransactionByBlockNumberAndIndex
* irc_getTransactionByHash
* irc_getTransactionCount
* irc_getTransactionReceipt
* irc_getUncleByBlockHashAndIndex
* irc_getUncleByBlockNumberAndIndex
* irc_getUncleCountByBlockHash
* irc_getUncleCountByBlockNumber
* irc_sendRawTransaction
* irc_getLogs ( not used in webu.js )

##### ( not supported )
* irc_getWork
* irc_submitWork
* irc_submitHashrate ( not used in webu.js )
