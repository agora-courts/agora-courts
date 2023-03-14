import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { DemoTokens } from '../target/types/demo_tokens';

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const demoProgram = anchor.workspace.DemoTokens as Program<DemoTokens>;
    const demoProvider = demoProgram.provider as anchor.AnchorProvider;

    it('submits_token!', async () => {
        //signer is just the wallet
        const signer = demoProvider.wallet;
        
    });
});
