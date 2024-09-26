import sha256 from 'crypto-js/sha256';

// Create the Block
class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return sha256(
      this.index +
        this.timestamp +
        JSON.stringify(this.data) +
        this.previousHash
    ).toString();
  }
}

module.exports = Block;