import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair, Transaction, Connection, LAMPORTS_PER_SOL, AccountMeta } from '@solana/web3.js';
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
    getAccount,
} from "@solana/spl-token";

export interface DisputeOptions {
    users: PublicKey[],
    graceDurationSeconds: number,
    initCaseDurationSeconds: number,
    commitDurationSeconds: number,
    revealDurationSeconds: number,
    voterRepRequired: anchor.BN,
    voterRepCost: anchor.BN,
    partyRepCost: anchor.BN,
    partyPayCost: anchor.BN,
    minVotes: anchor.BN,
    protocolPay: anchor.BN,
    protocolRep: anchor.BN
}

export interface DisputeConfig {
    graceEndsAt: anchor.BN,
    initCasesEndsAt: anchor.BN,
    votingEndsAt: anchor.BN,
    disputeEndsAt: anchor.BN,
    voterRepRequired: anchor.BN,
    voterRepCost: anchor.BN,
    repCost: anchor.BN,
    payCost: anchor.BN,
    minVotes: anchor.BN,
    protocolPay: anchor.BN,
    protocolRep: anchor.BN
}

export interface CourtConfig {
    court: PublicKey,
    courtName: string,
    repMint: PublicKey
}

//specific to the court and its ix, contains court owner, etc
export class CourtSuite {
    // provider and program
    provider: anchor.AnchorProvider;
    program: anchor.Program<AgoraCourt>;
    connection: Connection;

    // authorities
    editAuthority: Keypair;
    mintAuthority: Keypair;
    repMint: Keypair;
    payMint: Keypair;
    protocol: Keypair;

    // info
    decimals: number;
    courtName: string;
    disputeID: anchor.BN;

    // pdas
    court: { publicKey: PublicKey; bump: number };
    dispute: { publicKey: PublicKey; bump: number };

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

    setAccounts = async (decimals: number, courtName: string) => {
        //create auth accs
        this.editAuthority = Keypair.generate();
        this.repMint = Keypair.generate();
        this.payMint = Keypair.generate();
        this.mintAuthority = Keypair.generate();
        this.protocol = Keypair.generate();

        //set court pda
        this.court = this.findProgramAddress("court", courtName);

        //set court info
        this.decimals = decimals;
        this.courtName = courtName;

        //airdrop 2 sol to editAuth
        await this.requestAirdrop(this.editAuthority.publicKey, 2);

        //build tx
        let tx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: this.editAuthority.publicKey,
                newAccountPubkey: this.repMint.publicKey,
                space: MINT_SIZE,
                lamports: await getMinimumBalanceForRentExemptMint(this.connection),
                programId: TOKEN_PROGRAM_ID
            }),
            createInitializeMint2Instruction(
                this.repMint.publicKey,
                decimals,
                this.mintAuthority.publicKey,
                null
            )
        )

        //send tx
        await this.provider.sendAndConfirm(tx, [this.editAuthority, this.repMint]);
    }

    // --- UTILS --- //

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

    mintRepTokens = async (ata: PublicKey, amount: number | bigint) => {
        await mintToChecked(
            this.connection,
            this.editAuthority,
            this.repMint.publicKey,
            ata,
            this.mintAuthority,
            amount,
            this.decimals,
        )
    }

    getRepTokenAmount = (amount: number) => {
        return amount * Math.pow(10, this.decimals);
    }

    getRepATA = (owner: PublicKey, isPDA: boolean = true) => {
        return getAssociatedTokenAddressSync(
            this.repMint.publicKey,
            owner,
            isPDA,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID   
        );
    }

    getCourtConfig = () => {
        let config: CourtConfig = {
            court: this.court.publicKey,
            courtName: this.courtName,
            repMint: this.repMint.publicKey
        };
        return config;
    }

    getSolBalance = async (pubkey: PublicKey) => {
        return this.provider.connection
          .getBalance(pubkey)
          .then((balance) => balance)
          .catch(() => 0);
    }

    getTokenBalance = async (ata: PublicKey) => {
        return getAccount(this.provider.connection, ata)
          .then((account) => Number(account.amount))
          .catch(() => 0);
    };

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

    // --- INSTRUCTIONS --- //

    initCourt = async (maxVotes: number) => {
        try {
            await this.program.methods
                .initializeCourt(
                    this.courtName,
                    maxVotes
                )
                .accounts({
                    court: this.court.publicKey,
                    authority: this.editAuthority.publicKey,
                    protocol: this.protocol.publicKey,
                    repMint: this.repMint.publicKey,
                    payMint: this.program.programId, //NULL
                    systemProgram: SystemProgram.programId,
                })
                .signers([
                    this.editAuthority
                ])
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    initDispute = async (config: DisputeOptions) => {
        let courtState = await this.program.account.court.fetch(this.court.publicKey);
        this.dispute = this.findProgramAddress("dispute", [this.court.publicKey, courtState.numDisputes]);

        let protocolRepAta = await getOrCreateAssociatedTokenAccount(
            this.connection,
            this.editAuthority,
            this.repMint.publicKey,
            this.protocol.publicKey,
            true
        );

        try {
            await this.mintRepTokens(protocolRepAta.address, config.protocolRep.toNumber());
        } catch (err) {
            console.log(err);
            throw err;
        }

        let curTime = Math.floor(Date.now() / 1000);
        let repVault = this.getRepATA(this.dispute.publicKey);

        let disputeConfig: DisputeConfig = {
            graceEndsAt: new anchor.BN(curTime + config.graceDurationSeconds),
            initCasesEndsAt: new anchor.BN(curTime + config.initCaseDurationSeconds),
            votingEndsAt: new anchor.BN(curTime + config.commitDurationSeconds),
            disputeEndsAt: new anchor.BN(curTime + config.revealDurationSeconds),
            voterRepRequired: config.voterRepRequired,
            voterRepCost: config.voterRepCost,
            repCost: config.partyRepCost,
            payCost: config.partyPayCost,
            minVotes: config.minVotes,
            protocolPay: config.protocolPay,
            protocolRep: config.protocolRep
        }

        try {
            await this.program.methods
                .initializeDispute(
                    this.courtName,
                    config.users,
                    disputeConfig
                )
                .accounts({
                    dispute: this.dispute.publicKey,
                    repVault: repVault,
                    payVault: this.program.programId, //NULL
                    court: this.court.publicKey,
                    payer: this.editAuthority.publicKey,
                    protocol: this.protocol.publicKey,
                    protocolRepAta: protocolRepAta.address,
                    protocolPayAta: this.program.programId, //NULL
                    repMint: this.repMint.publicKey,
                    payMint: this.program.programId, //NULL
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
                })
                .signers([this.editAuthority, this.protocol])
                .rpc()
        } catch (err) {
            console.log(err);
            throw err;
        }

        this.disputeID = courtState.numDisputes;

        return disputeConfig;
    }

    closeDispute = async () => {
        try {
            await this.program.methods
                .closeDispute(
                    this.disputeID
                )
                .accounts({
                    dispute: this.dispute.publicKey,
                    court: this.court.publicKey,
                    payer: this.editAuthority.publicKey,
                })
                .signers([this.editAuthority])
                .rpc();
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}
