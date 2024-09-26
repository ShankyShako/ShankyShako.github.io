const Block = require('./BlockGM');
import {GenesisBlock, AppendExistingBlock, AppendNewBlock, ValChain}  from './BlockChainGM';
// create block chain
let ChainChain = [GenesisBlock(999)];

// existing block demo
let Block32 = new Block(0, Date.now(), 73, '')
ChainChain.push(AppendExistingBlock(ChainChain, Block32))

// new block demo
ChainChain.push(AppendNewBlock(ChainChain, 22));
ChainChain.push(AppendNewBlock(ChainChain, 45));

ValChain(ChainChain)

// block tampering demo
ChainChain[2].hash = 123
ChainChain[3].previousHash = 333
ChainChain[1].data = 32
ValChain(ChainChain)
console.log(ChainChain[1].hash);