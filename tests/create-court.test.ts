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

    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;

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
        
        const [protocolPDA, protBump] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("protocol")
                ],
                demoProgram.programId
            );

        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    protocolPDA.toBuffer(),
                ],
                agoraProgram.programId
            );

        let protState = await demoProgram.account.protocol.fetch(protocolPDA);
        console.log("bumps: ", protState.bump, ": ", protBump);

        console.log("protocol: ", protocolPDA.toString());
        console.log("agoraProgram: ", agoraProgram.programId.toString());
        console.log("courtPDA: ", courtPDA.toString());

        //calls the initialize method
        await demoProgram.methods
        .createCourt(
            
        )
        .accounts({
            protocol: protocolPDA,
            repMint: repMintPDA,
            courtPda: courtPDA,
            payer: signer.publicKey,
            agoraProgram: agoraProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
        })
        .rpc()

        console.log("rep_mint: ", repMintPDA.toString());
        //console.log("rep_mint_buffer: ", repMint.publicKey.toBuffer());
        console.log("court: ", courtPDA.toString());
        console.log("protocol: ", protocolPDA.toString()); //should be ~5 SOL

        let courtState = await agoraProgram.account.court.fetch(courtPDA);
        protState = await demoProgram.account.protocol.fetch(protocolPDA);

        console.log("protState->disputes: ", protState.numTickers);

        expect(courtState.maxDisputeVotes).to.equal(10);
        //avoid expect on BN
        console.log(courtState.numDisputes.toString());
        console.log("-------");
        console.log("stored_rep_mint: ", courtState.repMint.toString());
        console.log("stored_pay_mint (null): ", courtState.payMint);
    });
});
