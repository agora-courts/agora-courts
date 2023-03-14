import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint
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

    //test specific information

    it('create_court!', async () => {
        //signer is just the wallet
        const signer = demoProvider.wallet;

        const [repMintPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("rep_mint")
                ],
                demoProgram.programId
            );
        
        const [protocolPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("protocol")
                ],
                demoProgram.programId
            );

        console.log("protocol: ", protocolPDA)

        //calls the initialize method
        await demoProgram.methods
        .initialize()
        .accounts({
            protocol: protocolPDA,
            repMint: repMintPDA,
            payer: signer.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        })
        .rpc()

        console.log("rep_mint: ", repMintPDA.toString());
        console.log("protocol: ", protocolPDA.toString()); //should be ~5 SOL

        let protState = await demoProgram.account.protocol.fetch(protocolPDA);

        //avoid expect on BN
        console.log("protocol bump: ", protState.bump);
        console.log("protocol id: ", protState.numTickers);
    });
});
