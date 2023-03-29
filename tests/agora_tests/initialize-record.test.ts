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
import { user } from "./config";

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
    const user_one = Keypair.generate(); //dummy user
    console.log("New user secret: ", user_one.secretKey.toString());

    it('init_user_one!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;

        const airdropSignature = await connection.requestAirdrop(
            user_one.publicKey,
            1*LAMPORTS_PER_SOL,
        );
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });

        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );
        
        const [recordPDA, recordBump] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user_one.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        await agoraProgram.methods
            .initializeRecord(

            )
            .accounts({
                record: recordPDA,
                court: courtPDA,
                courtAuthority: signer.publicKey,
                payer: user_one.publicKey,
                systemProgram: SystemProgram.programId
            })
            .signers(
                [user_one]
            )
            .rpc();

        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        console.log("pubkey: ", recordPDA);
        console.log("Record: ", recordState.claimQueue);
        console.log("currently staked rep/pay: ", recordState.currentlyStakedPay.toString(), " ", recordState.currentlyStakedRep.toString());
        expect(recordBump).to.equal(recordState.bump);
    });
});
