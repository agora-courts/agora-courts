import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Connection, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { expect } from 'chai';
import { AgoraCourt } from '../../target/types/agora_court';
import { createUsers } from './config';

describe('agora-court', () => {
    //find the provider and set the anchor provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const connection = new Connection("https://api.devnet.solana.com");

    //get the current program and provider from the IDL
    const agoraProgram = anchor.workspace.AgoraCourt as Program<AgoraCourt>;
    const agoraProvider = agoraProgram.provider as anchor.AnchorProvider;

    //test specific information and new users
    const user_one = Keypair.generate();
    const user_two = Keypair.generate();
    const user_three = Keypair.generate();
    console.log("New user pubkeys:\n ", user_one.publicKey.toString(), "\n", user_two.publicKey.toString(), "\n", user_three.publicKey.toString(), "\n--------");

    it('init_three_users!', async () => {
        //signer is just the wallet
        const signer = agoraProvider.wallet;
        let tx = new Transaction();

        //airdrop SOL for fees
        const airdropSignature = await connection.requestAirdrop(
            user_one.publicKey,
            0.6*LAMPORTS_PER_SOL,
        );
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: airdropSignature,
        });

        //find all PDAs
        const [courtPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("court"),
                    provider.wallet.publicKey.toBuffer(),
                ],
                agoraProgram.programId
            );
        
        const [recordOnePDA, recordBump] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user_one.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        const [recordTwoPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user_two.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        const [recordThreePDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    user_three.publicKey.toBuffer()
                ],
                agoraProgram.programId
            )
        

        //create first record
        tx.add(
            await agoraProgram.methods
                .initializeRecord(

                )
                .accounts({
                    record: recordOnePDA,
                    court: courtPDA,
                    courtAuthority: signer.publicKey,
                    payer: user_one.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .signers(
                    [user_one]
                )
                .instruction()
        )

        //fund two other accounts
        tx.add(
            SystemProgram.transfer(
                {
                    fromPubkey: user_one.publicKey,
                    lamports: 0.2*LAMPORTS_PER_SOL,
                    toPubkey: user_two.publicKey
                }
            ),
            SystemProgram.transfer(
                {
                    fromPubkey: user_one.publicKey,
                    lamports: 0.2*LAMPORTS_PER_SOL,
                    toPubkey: user_three.publicKey
                }
            )
        )

        //initialize two other records
        tx.add(
            await agoraProgram.methods
                .initializeRecord(
                )
                .accounts({
                    record: recordTwoPDA,
                    court: courtPDA,
                    courtAuthority: signer.publicKey,
                    payer: user_two.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .signers(
                    [user_two]
                )
                .instruction(),
            await agoraProgram.methods
                .initializeRecord(
                )
                .accounts({
                    record: recordThreePDA,
                    court: courtPDA,
                    courtAuthority: signer.publicKey,
                    payer: user_three.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .signers(
                    [user_three]
                )
                .instruction()
        )

        await provider.sendAndConfirm(tx, [user_one, user_two, user_three]);

        let arr = [recordOnePDA, recordTwoPDA, recordThreePDA];
        arr.forEach(async element => {
            let recordState = await agoraProgram.account.voterRecord.fetch(element);
            console.log("-------------------------");
            console.log("User Record PDA: ", element.toString());
            console.log("Record: ", recordState.claimQueue);
            console.log("currently staked rep/pay: ", recordState.currentlyStakedPay.toString(), " ", recordState.currentlyStakedRep.toString());
            expect(recordBump).to.equal(recordState.bump);
        });

        createUsers(user_one, user_two, user_three);
    });
});
