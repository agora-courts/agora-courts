import { Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

//Replace values with values wanting to test :D
export const mintAuthority = Keypair.generate(); //replace with Keypair.fromSecretKey for tests
export const repMint = Keypair.generate();
export const disputeId = new anchor.BN(10);
export const decimals = 9;

const user_one = Keypair.generate();
const user_two = Keypair.generate();
const user_three = Keypair.generate();
const user_four = Keypair.generate();
export const user = user_three;

export const voter = Keypair.generate();