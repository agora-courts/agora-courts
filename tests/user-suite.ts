import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AgoraCourt } from '../target/types/agora_court';
import { 
    TOKEN_PROGRAM_ID, 
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    createInitializeMint2Instruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    mintToChecked,
    getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { CourtConfig } from './court-suite';
import keccak from "keccak";

// specific to a single user of Agora
export class UserSuite {
    // provider and program
    provider: anchor.AnchorProvider;
    program: anchor.Program<AgoraCourt>;
    connection: Connection;

    // user
    user: Keypair;

    // court info
    courtConfig: CourtConfig;
    
    // pdas
    record: { publicKey: PublicKey; bump: number };
    case: { publicKey: PublicKey; bump: number }; //last init case

    // vote
    salt: string; //last salt
    votedFor: PublicKey; //last voted for

    // === CONSTRUCTOR === //

    constructor() {
        this.provider = anchor.AnchorProvider.env();
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.AgoraCourt as anchor.Program<AgoraCourt>;
        this.connection = this.provider.connection;

        anchor.BN.prototype.toJSON = function () {
            return this.toString(10);
        };
    }

    // === ASYNC CONSTRUCTOR === //

    setAccounts = async (config: CourtConfig) => {
        this.user = Keypair.generate();
        this.courtConfig = config;

        await this.requestAirdrop(this.user.publicKey, 1);

        this.record = this.findProgramAddress("record", [this.courtConfig.court, this.user.publicKey]);
    }

    // === UTILS === //

    findProgramAddress = (label: string, extraSeeds = null) => {
        let seeds = [Buffer.from(anchor.utils.bytes.utf8.encode(label))];
        if (extraSeeds) {
            for (let extraSeed of extraSeeds) {
                if (typeof extraSeed === "string") {
                    seeds.push(Buffer.from(anchor.utils.bytes.utf8.encode(extraSeed)));
                } else if (anchor.BN.isBN(extraSeed)) {
                    seeds.push(extraSeed.toArrayLike(Buffer, "be", 8));
                } else if (Array.isArray(extraSeed)) {
                    seeds.push(Buffer.from(extraSeed));
                } else {
                    seeds.push(extraSeed.toBuffer());
                }
            }
        }
        let [publicKey, bump] = PublicKey.findProgramAddressSync(seeds, this.program.programId);
        return { publicKey, bump };
    };

    createSalt = (len: number) => {
        let chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let password = "";
        for (let i = 0; i <= len; i++) {
            var randomNumber = Math.floor(Math.random() * chars.length);
            password += chars.substring(randomNumber, randomNumber+1);
        }
    
        this.salt = password;
    }

    getRepATA = (owner: PublicKey, isPDA: boolean = true) => {
        return getAssociatedTokenAddressSync(
            this.courtConfig.repMint,
            owner,
            isPDA,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID   
        );
    }

    getOrCreateRepATA = async (owner: PublicKey, isPDA: boolean = true) => {
        let account = await getOrCreateAssociatedTokenAccount(
            this.connection,
            this.user,
            this.courtConfig.repMint,
            owner,
            true
        );

        return account;
    }

    requestAirdrop = async (pubkey: PublicKey, sol: number) => {
        let signature = await this.connection.requestAirdrop(pubkey, sol*LAMPORTS_PER_SOL);
        await this.confirmTx(signature);
    }

    confirmTx = async (txSignature: anchor.web3.TransactionSignature) => {
        const latestBlockHash = await this.connection.getLatestBlockhash();

        await this.connection.confirmTransaction(
        {
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txSignature,
        },
            "processed"
        );
    }

    confirmAndLogTx = async (txSignature: anchor.web3.TransactionSignature) => {
        await this.confirmTx(txSignature);
        let tx = await this.provider.connection.getTransaction(txSignature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
        });
        console.log(tx);
    }

    // === INSTRUCTIONS === //

    initRecord = async () => {
        try {
            await this.program.methods
                .initializeRecord(
                    this.courtConfig.courtName
                )
                .accounts({
                    record: this.record.publicKey,
                    court: this.courtConfig.court,
                    payer: this.user.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .signers([this.user])
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    interact = async (disputeID: anchor.BN) => { // ensure to mint to user ATA if rep cost
        const disputePDA = this.findProgramAddress("dispute", [this.courtConfig.court, disputeID]).publicKey;
        const userRepATA = await this.getOrCreateRepATA(this.user.publicKey);
        const repVaultATA = this.getRepATA(disputePDA);

        try {
            await this.program.methods
                .interact(
                    this.courtConfig.courtName,
                    disputeID
                )
                .accounts({
                    dispute: disputePDA,
                    repVault: repVaultATA,
                    payVault: this.program.programId, //None
                    record: this.record.publicKey,
                    court: this.courtConfig.court,
                    user: this.user.publicKey, //signer
                    userRepAta: userRepATA.address,
                    userPayAta: this.program.programId, //None
                    repMint: this.courtConfig.repMint,
                    payMint: this.program.programId, //None
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers(
                    [this.user]
                )
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    initCase = async (disputeID: anchor.BN, evidence: string) => {
        const disputePDA = this.findProgramAddress("dispute", [this.courtConfig.court, disputeID]).publicKey;
        const casePDA = this.findProgramAddress("case", [disputePDA, this.user.publicKey]);

        try {
            await this.program.methods
                .initializeCase(
                    this.courtConfig.courtName,
                    disputeID,
                    evidence
                )
                .accounts({
                    case: casePDA.publicKey,
                    voterRecord: this.record.publicKey,
                    dispute: disputePDA,
                    court: this.courtConfig.court,
                    payer: this.user.publicKey,
                    systemProgram: SystemProgram.programId
                })
                .signers(
                    [this.user]
                )
                .rpc();
        } catch (err) {
            console.log(err);
            throw err;
        }

        this.case = casePDA;
    }

    selectVote = async (disputeID: anchor.BN, candidate: PublicKey) => {
        // pdas and atas
        const disputePDA = this.findProgramAddress("dispute", [this.courtConfig.court, disputeID]).publicKey;
        const repVaultATA = this.getRepATA(disputePDA);
        const userRepATA = await this.getOrCreateRepATA(this.user.publicKey, false);
        
        // create salt
        this.createSalt(12);
        console.log("Salt: ", this.salt);

        // hash salt with pubkey
        let buf = Buffer.concat([
            candidate.toBuffer(),
            Buffer.from(this.salt, "utf-8")
        ]);
        let hash = keccak('keccak256').update(buf).digest();
        console.log("Hash: ", hash.toString('hex'));
        let hashArr = Array.from(new Uint8Array(hash));

        // send tx
        try {
            await this.program.methods
                .selectVote(
                    this.courtConfig.courtName,
                    disputeID,
                    hashArr
                )
                .accounts({
                    voterRecord: this.record.publicKey,
                    dispute: disputePDA,
                    repVault: repVaultATA,
                    court: this.courtConfig.court,
                    repMint: this.courtConfig.repMint,
                    payer: this.user.publicKey,
                    userRepAta: userRepATA.address,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers(
                    [this.user]
                )
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }

        this.votedFor = candidate;
        return hashArr;
    }

    revealVote = async (disputeID: anchor.BN) => {
        const disputePDA = this.findProgramAddress("dispute", [this.courtConfig.court, disputeID]).publicKey;
        const casePDA = this.findProgramAddress("case", [disputePDA, this.votedFor]).publicKey;

        try {
            await this.program.methods
                .revealVote(
                    this.courtConfig.courtName,
                    disputeID,
                    this.salt
                )
                .accounts({
                    case: casePDA,
                    candidate: this.votedFor,
                    voterRecord: this.record.publicKey,
                    dispute: disputePDA,
                    court: this.courtConfig.court,
                    payer: this.user.publicKey
                })
                .signers([this.user])
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    claim = async (disputeID: anchor.BN) => {
        const disputePDA = this.findProgramAddress("dispute", [this.courtConfig.court, disputeID]).publicKey;
        const repVaultATA = this.getRepATA(disputePDA);
        const userRepATA = this.getRepATA(this.user.publicKey, false);

        try {
            await this.program.methods
                .claim(
                    this.courtConfig.courtName,
                    disputeID
                )
                .accounts({
                    voterRecord: this.record.publicKey,
                    dispute: disputePDA,
                    repVault: repVaultATA,
                    payVault: this.program.programId, //None
                    court: this.courtConfig.court,
                    user: this.user.publicKey,
                    userPayAta: this.program.programId, //None
                    userRepAta: userRepATA,
                    repMint: this.courtConfig.repMint,
                    payMint: this.program.programId, //None
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers(
                    [this.user]
                )
                .rpc();
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}
