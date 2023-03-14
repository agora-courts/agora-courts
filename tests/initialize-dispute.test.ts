import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccount, 
    createAssociatedTokenAccountInstruction, 
    createInitializeMint2Instruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test specific information
    const decimals = 9;
    const mintAuthority = Keypair.fromSecretKey();
    const repMint = Keypair.fromSecretKey();
    console.log("mint auth: ", mintAuthority.publicKey.toString()); //4TmoWRpnymwf
    console.log("repmint: ", repMint.publicKey.toString()); //Aigi9pBudYLmNi

    it('initialize_dispute!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;

        let tx = new Transaction();

        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );
        
        let courtState = await agoraProgram.account.court.fetch(courtPDA);

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    courtState.numDisputes.toArrayLike(Buffer, "be", 8),
                ],
                agoraProgram.programId
            );

        const rep_vault_ata = getAssociatedTokenAddressSync(
            repMint.publicKey,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID   
        );

        const fromATA = getAssociatedTokenAddressSync(
            repMint.publicKey,
            signer.publicKey,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        //uncomment as needed for test case
        const receiver = await connection.getAccountInfo(fromATA);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction (
                    signer.publicKey,
                    fromATA,
                    signer.publicKey,
                    repMint.publicKey
                )
            )
        }

        let cur_time = Math.floor(Date.now() / 1000);
        console.log("unix_timestamp: ", cur_time);
        let LAMPORTS_PER_MINT = Math.pow(10, decimals);

        tx.add(
            createMintToInstruction(
                repMint.publicKey,
                fromATA,
                mintAuthority.publicKey,
                10 * LAMPORTS_PER_MINT
            )
        )

        //calls the initialize disp method
        tx.add(
            await agoraProgram.methods
            .initializeDispute(
                [null, null],
                {
                    graceEndsAt: new anchor.BN((cur_time + (20*60))), //20 min
                    initCasesEndsAt: new anchor.BN((cur_time + (35*60))), //35 min
                    endsAt: new anchor.BN((cur_time + (50*60))), //50 min
                    voterRepRequired: new anchor.BN(5 * LAMPORTS_PER_MINT),
                    voterRepCost: new anchor.BN(0),
                    repCost: new anchor.BN(15 * LAMPORTS_PER_MINT),
                    payCost: new anchor.BN(0),
                    minVotes: new anchor.BN(1),
                    protocolPay: new anchor.BN(0),
                    protocolRep: new anchor.BN(5 * LAMPORTS_PER_MINT)
                }
            )
            .accounts({
                dispute: disputePDA,
                repVault: rep_vault_ata,
                payVault: agoraProgram.programId,
                court: courtPDA,
                payer: signer.publicKey,
                protocol: signer.publicKey,
                protocolPayAta: agoraProgram.programId,
                protocolRepAta: fromATA,
                repMint: repMint.publicKey,
                payMint: agoraProgram.programId,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
            })
            .instruction()
        )

        await provider.sendAndConfirm(tx, [mintAuthority]);

        courtState = await agoraProgram.account.court.fetch(courtPDA);
        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        for (const key in disputeState.config) {
            console.log(key, ":", disputeState.config[key].toString());
        }
        console.log("Dispute: ", disputeState);
        console.log("To ATA: ", rep_vault_ata); //should have balance 5
    });
});
