import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js';
import { AgoraCourt } from '../../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction, 
    createMintToInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getMintInfo, getSingleUser, getDisputeID } from "./config";

//MUST SET USER CORRECTLY IN CONFIG TO CALL MORE THAN ONCE

describe('agora-court', () => {
    //get keys and info
    let [mintAuthority, repMint, decimals] = getMintInfo();
    let user = getSingleUser();
    let disputeId = getDisputeID();

    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    it('interact!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();
        let LAMPORTS_PER_MINT = Math.pow(10, decimals);

        //find PDAs
        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    disputeId.toArrayLike(Buffer, "be", 8),
                ],
                agoraProgram.programId
            );

        const [recordPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );

        //find user and dispute specific ATA
        const userRepATA = getAssociatedTokenAddressSync(
            repMint.publicKey,
            user.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const repVaultATA = getAssociatedTokenAddressSync(
            repMint.publicKey,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const receiver = await connection.getAccountInfo(userRepATA);
        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    userRepATA,
                    user.publicKey,
                    repMint.publicKey,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        //mint to user ATA bc there is a rep cost
        tx.add(
            createMintToInstruction(
                repMint.publicKey,
                userRepATA,
                mintAuthority.publicKey, //signer
                15 * LAMPORTS_PER_MINT
            )
        )

        //console log accounts
        console.log("disputePDA: ", disputePDA.toString());
        console.log("repVault: ", repVaultATA.toString());
        console.log("recordPDA: ", recordPDA.toString());
        console.log("userRepATA: ", userRepATA.toString());
        console.log("user: ", user.publicKey.toString());
        
        tx.add(
            await agoraProgram.methods
                .interact(
                    disputeId
                )
                .accounts({
                    dispute: disputePDA,
                    repVault: repVaultATA,
                    payVault: agoraProgram.programId, //None
                    record: recordPDA,
                    court: courtPDA,
                    courtAuthority: signer.publicKey,
                    user: user.publicKey, //signer
                    userPayAta: agoraProgram.programId, //None
                    userRepAta: userRepATA,
                    repMint: repMint.publicKey,
                    payMint: agoraProgram.programId, //None
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers(
                    [user]
                )
                .instruction()
        );

        await provider.sendAndConfirm(tx, [mintAuthority, user]);

        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        console.log("total interactions: ", disputeState.interactions);
        console.log("dispute.users: ", disputeState.users); //should include most recent interactor
        console.log("currently staked reputation: ", recordState.currentlyStakedRep.toNumber().toString(), " , pay: ", recordState.currentlyStakedPay.toNumber().toString());
        console.log("user_rep_ata: ", userRepATA.toString()); //should have 5 tokens
        console.log("rep_vault: ", repVaultATA.toString()); //should have received 15 tokens
    });
});
