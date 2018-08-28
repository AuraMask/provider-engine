const createPayload = require('./util/create-payload.js');
const SubproviderFromProvider = require('./subproviders/provider.js');
const createInfuraProvider = require('irc-json-rpc-infura/src/createProvider');
const ZeroClient = require('./zero');

let engine;

const infuraProvider = createInfuraProvider({
  network: 'localhost',
});

const infuraSubprovider = new SubproviderFromProvider(infuraProvider);
const providerParams = {
  rpcUrl: 'http://localhost:8545/',
  engineParams: {
    pollingInterval: 8000,
    blockTrackerProvider: infuraProvider,
  },
  dataSubprovider: infuraSubprovider,
};

engine = new ZeroClient(providerParams);

// network connectivity error
engine.on('error', err => {
  console.error(err.stack);
});

// log new blocks
engine.on('latest', block => {
  console.log('===============================');
  console.log(`LATEST BLOCK: #${block}`);
  console.log('===============================');
  engine.stop();
});

// sendAsync to get tx information
const txHash = '0xbe89a7eb4eba5aa871bc974c51429fe3beadb72b3b925d9c57a0572ebd415b8d';

engine.sendAsync(createPayload({
  method: 'irc_getTransactionByHash',
  params: [txHash],
}), (err, resp) => {
  console.log(resp);
});
engine.sendAsync(createPayload({
  method: 'irc_getTransactionReceipt',
  params: [txHash],
}), (err, resp) => {
  console.log(resp);
});
