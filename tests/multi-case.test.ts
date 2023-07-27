import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from "@solana/web3.js";
import { expect } from 'chai';
import { decimals, courtName, multiDisputeOptions as disputeOptions } from './config';
import { CourtSuite, DisputeConfig } from './court-suite';
import { UserSuite } from './user-suite';

describe('agora-court-basic', () => {
    //find the provider and set the anchor provider
    let cs = new CourtSuite();
    let userOne = new UserSuite();
    let userTwo = new UserSuite();
    let disputeConfig: DisputeConfig;

    const maxDisputeVotes = 10;

    it('async_court_constructor!', async () => {
        await cs.setAccounts(decimals, courtName);

        // check keypairs
        expect(PublicKey.isOnCurve(cs.editAuthority.publicKey)).to.be.true;
        expect(PublicKey.isOnCurve(cs.repMint.publicKey)).to.be.true;
        expect(PublicKey.isOnCurve(cs.mintAuthority.publicKey)).to.be.true;
        expect(PublicKey.isOnCurve(cs.protocol.publicKey)).to.be.true;

        // check pda
        expect(PublicKey.isOnCurve(cs.court.publicKey)).to.be.false;

        // check airdrop
        let solBalance = await cs.getSolBalance(cs.editAuthority.publicKey);
        expect(solBalance).to.be.greaterThan(0);
    });

    it('async_user_constructors!', async () => {
        let courtConfig = cs.getCourtConfig();

        await userOne.setAccounts(courtConfig);
        await userTwo.setAccounts(courtConfig);

        let arr = [userOne, userTwo];

        for (const user of arr) {
            expect(PublicKey.isOnCurve(user.user.publicKey)).to.be.true;

            expect(PublicKey.isOnCurve(user.record.publicKey)).to.be.false;

            let solBalance = await cs.getSolBalance(user.user.publicKey);
            expect(solBalance).to.be.greaterThan(0);
        }
    });

    it('initialize_court!', async () => {
        // call ix
        await cs.initCourt(maxDisputeVotes);

        // get state
        let courtState = await cs.program.account.court.fetch(cs.court.publicKey);

        // expected values
        let expectedCourtState = {
            editAuthority: cs.editAuthority.publicKey,
            protocol: cs.protocol.publicKey,
            repMint: cs.repMint.publicKey,
            payMint: null,
            numDisputes: new anchor.BN(0),
            maxDisputeVotes: maxDisputeVotes,
            bump: cs.court.bump,
        }

        // validate
        expect(JSON.stringify(courtState)).to.equal(JSON.stringify(expectedCourtState));
    });

    describe('init_disputes!', () => {
        it('init_two_records!', async () => {
            //init 2 records
            await userOne.initRecord();
            await userTwo.initRecord();

            let arr = [userOne.record, userTwo.record];

            // verify each record was setup
            arr.forEach(async element => {
                let recordState = await cs.program.account.voterRecord.fetch(element.publicKey);

                let expectedRecordState = {
                    claimQueue: [],
                    currentlyStakedRep: new anchor.BN(0),
                    currentlyStakedPay: new anchor.BN(0),
                    bump: element.bump,
                }

                expect(JSON.stringify(recordState)).to.equal(JSON.stringify(expectedRecordState));
            });
        });

        it('case_flow!', async () => {
            for (let i = 0; i < maxDisputeVotes; i++) {
                let str = "dispute_number_" + i;
                // =========================
                // === INITIALIZE_DISPUTE ==
                // =========================
                disputeConfig = await cs.initDispute(disputeOptions);

                // check dispute account
                let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);

                let expectedDisputeState = {
                    users: disputeOptions.users,
                    status: { grace: {} },
                    interactions: 0,
                    submittedCases: 0,
                    votes: new anchor.BN(0),
                    leader: {
                        user: PublicKey.default,
                        votes: new anchor.BN(0)
                    },
                    config: disputeConfig,
                    bump: cs.dispute.bump
                };

                expect(JSON.stringify(disputeState)).to.equal(JSON.stringify(expectedDisputeState));

                // check reputation protocol ata
                let protocolRepATA = cs.getRepATA(cs.protocol.publicKey);
                let balance = await cs.getTokenBalance(protocolRepATA);

                expect(balance).to.eq(0);

                // check reputation vault
                let repVault = cs.getRepATA(cs.dispute.publicKey);
                balance = await cs.getTokenBalance(repVault);
                expect(balance).to.eq(disputeConfig.protocolRep.toNumber());

                // ======================
                // === INTERACT_TWICE ===
                // ======================
                let first_balance = disputeOptions.protocolRep.toNumber() + disputeOptions.partyRepCost.toNumber();
                let second_balance = first_balance + disputeOptions.partyRepCost.toNumber();
                 
                // FIRST
                let ata = await userOne.getOrCreateRepATA(userOne.user.publicKey, false);
                await cs.mintRepTokens(ata.address, disputeOptions.partyRepCost.toNumber());

                await userOne.interact(cs.disputeID);

                // check interaction
                disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                expect(userOne.user.publicKey.equals(disputeState.users[0])).to.be.true;
                expect(disputeState.interactions).to.equal(1);

                // check token transfer
                repVault = cs.getRepATA(cs.dispute.publicKey);
                balance = await cs.getTokenBalance(repVault);

                expect(balance).to.eq(first_balance);

                // SECOND
                ata = await userTwo.getOrCreateRepATA(userTwo.user.publicKey, false);
                await cs.mintRepTokens(ata.address, disputeOptions.partyRepCost.toNumber());

                await userTwo.interact(cs.disputeID);

                // check interaction
                disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                expect(userTwo.user.publicKey.equals(disputeState.users[1])).to.be.true;
                expect(disputeState.interactions).to.equal(2);

                // check token transfer
                repVault = cs.getRepATA(cs.dispute.publicKey);
                balance = await cs.getTokenBalance(repVault);

                expect(balance).to.eq(second_balance);

                // =======================
                // === INIT_CASE_TWICE ===
                // =======================

                // FIRST
                let evidence = "I'm right guys trust";
                await userOne.initCase(cs.disputeID, evidence);

                // check dispute account status
                disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                let expectedDisputeStatus = { waiting: {} }
                expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expectedDisputeStatus));
                expect(disputeState.submittedCases).to.equal(1);

                // check case account
                let caseState = await cs.program.account.case.fetch(userOne.case.publicKey);
                let expectedCase = {
                    votes: new anchor.BN(0),
                    evidence: evidence,
                    bump: userOne.case.bump
                };
                expect(JSON.stringify(caseState)).to.equal(JSON.stringify(expectedCase));

                // SECOND
                evidence = "Don't trust that bozo";
                await userTwo.initCase(cs.disputeID, evidence);

                // check dispute account status
                disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                let expected = { voting: {} }
                expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expected));
                expect(disputeState.submittedCases).to.equal(2);

                // check case account
                caseState = await cs.program.account.case.fetch(userTwo.case.publicKey);
                expectedCase = {
                    votes: new anchor.BN(0),
                    evidence: evidence,
                    bump: userTwo.case.bump
                };
                expect(JSON.stringify(caseState)).to.equal(JSON.stringify(expectedCase));

                console.log("       ✔ " + str + "!");
            }
        });

        it('verify_record!', async () => {
            let recordState = await cs.program.account.voterRecord.fetch(userOne.record.publicKey);

            expect(recordState.claimQueue.length).to.equal(maxDisputeVotes);

            // console.log(recordState.currentlyStakedRep.toNumber());
            // console.log("Expected: ", maxDisputeVotes * disputeOptions.partyRepCost.toNumber());
            expect(recordState.currentlyStakedRep.toNumber()).to.equal(maxDisputeVotes * disputeOptions.partyRepCost.toNumber());
        });
    });
});