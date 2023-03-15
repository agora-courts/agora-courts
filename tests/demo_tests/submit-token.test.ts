import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { TOKEN_PROGRAM_ID, 
    createInitializeMint2Instruction,
    createInitializeMintInstruction,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddressSync,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import { DemoTokens } from '../../target/types/demo_tokens';

describe('demo-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const demoProgram = anchor.workspace.DemoTokens as Program<DemoTokens>;
    const demoProvider = demoProgram.provider as anchor.AnchorProvider;

    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;

    //IX specific inputs
    const address = "0x5j2ski8201ks";
    const image = "https://cdn.shopify.com/s/files/1/0803/3763/products/33_5000x.jpg?v=1654813334"
    const name = "Better Dog";
    const ticker = "BDG";
    const description = "This is a better dog coin that will outperform all others.";
    const badges = ["Doge", "Rugpull"];

    it('submits_token!', async () => {
        //signer is just the wallet
        const signer = demoProvider.wallet;
        let tx = new Transaction();
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

        let protState = await demoProgram.account.protocol.fetch(protocolPDA);
        console.log("protNum: ", protState.numTickers);

        const [tickerAccPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("ticker"),
                    new Uint8Array([protState.numTickers])
                ],
                demoProgram.programId
            );

        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    protocolPDA.toBuffer()
                ],
                agoraProgram.programId
            );

        let courtState = await agoraProgram.account.court.fetch(courtPDA);
        console.log("courtNum: ", courtState.numDisputes.toNumber().toString());

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    courtState.numDisputes.toArrayLike(Buffer, "be", 8)
                ],
                agoraProgram.programId
            );
        
        const repVault = getAssociatedTokenAddressSync(
            repMintPDA,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        //needs to be initialized, so call receive tokens first
        const protocolRepATA = getAssociatedTokenAddressSync(
            repMintPDA,
            protocolPDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log("rep mint: ", repMintPDA.toString());
        console.log("court pda: ", courtPDA.toString());
        console.log("dispute pda: ", disputePDA.toString());
        console.log("rep vault: ", repVault.toString());
        console.log("prot rep ata: ", protocolRepATA.toString());

        await demoProgram.methods
            .submitToken(
                address,
                image,
                name,
                ticker,
                description,
                badges
            )
            .accounts({
                protocol: protocolPDA,
                repMint: repMintPDA,
                tickerAcc: tickerAccPDA,
                courtPda: courtPDA,
                disputePda: disputePDA,
                repVault: repVault,
                protocolRepAta: protocolRepATA,
                payer: signer.publicKey,
                agoraProgram: agoraProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId
            })
            .rpc();

            let tickerState = await demoProgram.account.ticker.fetch(tickerAccPDA);

            console.log("tickerInfo: ", tickerState);
            let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
            for (const key in disputeState.config) {
                console.log(key, ":", disputeState.config[key].toString());
            }

            console.log("Prot ATA: ", protocolRepATA); //should decrease
            console.log("Vault ATA: ", repVault); //should increrase
    });
});
