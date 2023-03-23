import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, 
    createAssociatedTokenAccount, 
    createAssociatedTokenAccountInstruction, 
    createInitializeMint2Instruction,
    createMintToInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { disputeId } from "./config"

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    it('close_dispute!', async () => {
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

        const [disputePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("dispute"),
                    courtPDA.toBuffer(),
                    disputeId.toArrayLike(Buffer, "be", 8),
                ],
                agoraProgram.programId
            );

        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        console.log(disputeState);

        await agoraProgram.methods
            .closeDispute(
                disputeId
            )
            .accounts({
                dispute: disputePDA,
                court: courtPDA,
                payer: signer.publicKey
            })
            .rpc();

        disputeState = await agoraProgram.account.dispute.fetch(disputePDA);
        console.log("Closed dispute: ", disputeState);
                
    });
});


