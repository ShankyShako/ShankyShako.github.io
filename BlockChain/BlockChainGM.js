const Block = require('./BlockGM');

// initialize blockchain
function GenesisBlock(data) {
    return new Block(0, Date.now(), data, 0)
  }

// for new blocks to be created
  function AppendNewBlock(BlockChain, data) {
    index = BlockChain.length;
    const previousBlock = BlockChain[index - 1];
    return new Block(index, Date.now(), data, previousBlock.hash)
  }

// for Already existing blocks wanting to get in
  function AppendExistingBlock(BlockChain, OldBlock) {
    index = BlockChain.length;
    const previousBlock = BlockChain[index - 1];
    OldBlock.index = index;
    OldBlock.previousHash = previousBlock.hash;
    OldBlock.hash = OldBlock.calculateHash();
    return OldBlock
  }

  function ValChain(BlockChain) {
    //Loop all of the chain
    for (let i = 0; i < BlockChain.length; i++){
      //Check Hash Consistency
      if (BlockChain[i].hash === BlockChain[i].calculateHash()){
        BlockChain[i].calculateHash();
      }
      else {
        console.log("BlockChain link " + i + " miscalculated Hash, correcting hash...");
        BlockChain[i].hash = BlockChain[i].calculateHash();
      }

      //Check previous Hash Consistency
      if (BlockChain[i].previousHash === 0 || BlockChain[i].previousHash === BlockChain[i-1].hash){
        BlockChain[i].calculateHash();
      }
      else {
        console.log("BlockChain link " + i + " incorrect previous hash, correcting hash...");
        BlockChain[i].previousHash = BlockChain[i-1].hash;
      }
    }
  }

  module.exports = {GenesisBlock, AppendExistingBlock, AppendNewBlock, ValChain};