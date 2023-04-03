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
    createAssociatedTokenAccountInstruction,
    NATIVE_MINT,
    createWrappedNativeAccount,
    createTransferCheckedInstruction,
    createSyncNativeInstruction,
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

        let receiver = await connection.getAccountInfo(repVault);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    repVault,
                    disputePDA,
                    repMintPDA,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        const payVault = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            disputePDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        receiver = await connection.getAccountInfo(payVault);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    payVault,
                    disputePDA,
                    NATIVE_MINT,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        //converting SOL to wSOL
        const userPayAcc = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            signer.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        receiver = await connection.getAccountInfo(userPayAcc);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    userPayAcc,
                    signer.publicKey,
                    NATIVE_MINT,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        tx.add(
            SystemProgram.transfer({
                fromPubkey: signer.publicKey,
                toPubkey: userPayAcc,
                lamports: 2*LAMPORTS_PER_SOL
            }),
            createSyncNativeInstruction(
                userPayAcc
            )
        )

        const protocolRepATA = getAssociatedTokenAddressSync(
            repMintPDA,
            protocolPDA,
            true,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        receiver = await connection.getAccountInfo(protocolRepATA);

        if (receiver == null) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    protocolRepATA,
                    protocolPDA,
                    repMintPDA,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        const [recordPDA, ] = PublicKey
            .findProgramAddressSync(
                [
                    anchor.utils.bytes.utf8.encode("record"),
                    courtPDA.toBuffer(),
                    signer.publicKey.toBuffer()
                ],
                agoraProgram.programId
            );

        console.log("protocl PDA: ", protocolPDA.toString());
        console.log("court PDA: ", courtPDA.toString());
        console.log("protRepATA: ", protocolRepATA.toString());

        
        tx.add(
            await agoraProgram.methods
                .initializeRecord(
                )
                .accounts({
                    record: recordPDA,
                    court: courtPDA,
                    courtAuthority: protocolPDA,
                    payer: signer.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .instruction()
        )

        tx.add(
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
                    protocolRepAta: protocolRepATA,
                    repMint: repMintPDA,
                    payMint: NATIVE_MINT,
                    tickerAcc: tickerAccPDA,
                    courtPda: courtPDA,
                    disputePda: disputePDA,
                    repVault: repVault,
                    payVault: payVault,
                    payer: signer.publicKey,
                    recordPda: recordPDA,
                    userPayAta: userPayAcc,
                    agoraProgram: agoraProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId
                })
                .instruction()
        );

        await provider.sendAndConfirm(tx);

        let tickerState = await demoProgram.account.ticker.fetch(tickerAccPDA);

        console.log("tickerInfo: ", tickerState);
        let disputeState = await agoraProgram.account.dispute.fetch(disputePDA);

        for (const key in disputeState.config) {
            console.log(key, ":", disputeState.config[key].toString());
        }

        console.log("Prot ATA: ", protocolRepATA); //should decrease
        console.log("Vault ATA: ", repVault); //should increase

        let recordState = await agoraProgram.account.voterRecord.fetch(recordPDA);
        console.log("total interactions: ", disputeState.interactions); //1
        console.log("dispute.users: ", disputeState.users); //should include most recent interactor
        console.log("currently staked reputation: ", recordState.currentlyStakedRep.toNumber().toString(), " , pay: ", recordState.currentlyStakedPay.toNumber().toString());
        console.log("user_pay_acc: ", userPayAcc.toString()); //should have lost 2 sol
    });
});
