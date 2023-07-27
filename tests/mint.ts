import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { expect } from 'chai';
import { maxDisputeVotes, decimals, courtName, basicDisputeOptions as disputeOptions } from './config';
import { CourtSuite, DisputeConfig } from './court-suite';
import { UserSuite } from './user-suite';
import { ASSOCIATED_TOKEN_PROGRAM_ID, MINT_SIZE, TOKEN_PROGRAM_ID, createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, createInitializeMint2Instruction, createMintToInstruction, getAssociatedTokenAddressSync, getMinimumBalanceForRentExemptMint } from '@solana/spl-token';

const getRepATA = (owner: PublicKey, mint: PublicKey, isPDA: boolean = true) => {
    return getAssociatedTokenAddressSync(
        mint,
        owner,
        isPDA,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID   
    );
}

describe('mint-tokens', () => {
    //find the provider and set the anchor provider
    let provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // it('create-mint!', async () => {
    //     let x = Keypair.generate();
    //     console.log("pubkey: ", x.publicKey);
    //     console.log(x.secretKey);

    //     let tx = new Transaction().add(
    //         SystemProgram.createAccount({
    //             fromPubkey: provider.publicKey,
    //             newAccountPubkey: x.publicKey,
    //             space: MINT_SIZE,
    //             lamports: await getMinimumBalanceForRentExemptMint(provider.connection),
    //             programId: TOKEN_PROGRAM_ID
    //         }),
    //         createInitializeMint2Instruction(
    //             x.publicKey,
    //             decimals,
    //             provider.publicKey,
    //             null
    //         )
    //     );

    //     await provider.sendAndConfirm(tx, [x]);
    // });

    it('mint-to!', async () => {
        // mint addr = Dqzbjg3cLwZZ2k6Bj1Sk3XCcr398xaBktDe4ij8enRX6
        let mint = Keypair.fromSecretKey(Uint8Array.from([
            198, 154, 238, 236, 206, 59,  59,  40, 154, 197,  48,
            192, 230, 180,  36, 236,  0, 156,  66,  84,  19, 107,
            231, 176, 184,  29,  70, 51, 101,  78, 106,  17, 190,
            217,  63, 205,  84,  17, 82,  86, 115, 224, 210, 197,
            101,  28,  67, 227, 201, 52, 197, 121, 105, 107,  16,
            186, 102,  22, 156, 152, 81, 209,  39, 233
        ]));

        let user = new PublicKey("HphhevqxczjbdfQhb85aHiuYe8xf7jf6RBSzmv99fAaj");

        let ata = getRepATA(user, mint.publicKey);

        let ataStatus = await provider.connection.getAccountInfo(ata);

        let tx = new Transaction();

        if (!ataStatus) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    provider.publicKey,
                    ata,
                    user,
                    mint.publicKey,
                )
            )
        }

        tx.add(
            createMintToInstruction(
                mint.publicKey,
                ata,
                provider.publicKey,
                100 * Math.pow(10, 9)
            )
        )

        await provider.sendAndConfirm(tx);
    })

});