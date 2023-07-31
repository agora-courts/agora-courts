import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from "@solana/web3.js";
import { expect } from 'chai';
import { maxDisputeVotes, decimals, courtName, basicDisputeOptions as disputeOptions } from './config';
import { CourtSuite, DisputeConfig } from './court-suite';
import { UserSuite } from './user-suite';

describe('agora-court-basic', () => {
    //find the provider and set the anchor provider
    let cs = new CourtSuite();
    let userOne = new UserSuite();
    let userTwo = new UserSuite();
    let userThree = new UserSuite();
    let disputeConfig: DisputeConfig;

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
        await userThree.setAccounts(courtConfig);

        let arr = [userOne, userTwo, userThree];

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

    it('initialize_dispute', async () => {
        disputeConfig = await cs.initDispute(disputeOptions);

        // check dispute account
        let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);

        let expectedDisputeState = {
            users: disputeOptions.users,
            votes: new Array<anchor.BN>(disputeOptions.users.length).fill(new anchor.BN(0)),
            status: { grace: {} },
            interactions: 0,
            submittedCases: 0,
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
    });

    it('init_three_records!', async () => {
        //init 3 records
        await userOne.initRecord();
        await userTwo.initRecord();
        await userThree.initRecord();

        let arr = [userOne.record, userTwo.record, userThree.record];

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

    describe('interact_twice!', () => {
        let first_balance = disputeOptions.protocolRep.toNumber() + disputeOptions.partyRepCost.toNumber();
        let second_balance = first_balance + disputeOptions.partyRepCost.toNumber();

        it('first_interact!', async () => {
            // mint tokens
            let ata = await userOne.getOrCreateRepATA(userOne.user.publicKey, false);
            await cs.mintRepTokens(ata.address, disputeOptions.partyRepCost.toNumber());

            await userOne.interact(cs.disputeID);

            // check interaction
            let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
            expect(userOne.user.publicKey.equals(disputeState.users[0])).to.be.true;
            expect(disputeState.interactions).to.equal(1);

            // check token transfer
            let repVault = cs.getRepATA(cs.dispute.publicKey);
            let balance = await cs.getTokenBalance(repVault);

            expect(balance).to.eq(first_balance);

            // check record currently staked rep
            let recordState = await cs.program.account.voterRecord.fetch(userOne.record.publicKey);
            expect(recordState.currentlyStakedRep.eq(disputeConfig.repCost)).to.be.true;
        });

        it('second_interact!', async () => {
            // mint tokens
            let ata = await userTwo.getOrCreateRepATA(userTwo.user.publicKey, false);
            await cs.mintRepTokens(ata.address, disputeOptions.partyRepCost.toNumber());

            await userTwo.interact(cs.disputeID);

            // check interaction
            let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
            expect(userTwo.user.publicKey.equals(disputeState.users[1])).to.be.true;
            expect(disputeState.interactions).to.equal(2);

            // check token transfer
            let repVault = cs.getRepATA(cs.dispute.publicKey);
            let balance = await cs.getTokenBalance(repVault);

            expect(balance).to.eq(second_balance);

            // check record currently staked rep
            let recordState = await cs.program.account.voterRecord.fetch(userTwo.record.publicKey);
            expect(recordState.currentlyStakedRep.eq(disputeConfig.repCost)).to.be.true;
        })
    });

    describe('init_case_twice!', () => {
        it('first_init_case!', async () => {
            let evidence = "I'm right guys trust";
            await userOne.initCase(cs.disputeID, evidence);

            // check dispute account status
            let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
            let expectedDisputeStatus = { waiting: {} }
            expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expectedDisputeStatus));
            expect(disputeState.submittedCases).to.equal(1);

            // check case account
            let caseState = await cs.program.account.case.fetch(userOne.case.publicKey);
            let expectedCase = {
                evidence: evidence,
                bump: userOne.case.bump
            };
            expect(JSON.stringify(caseState)).to.equal(JSON.stringify(expectedCase));

            // check voter record
            let recordState = await cs.program.account.voterRecord.fetch(userOne.record.publicKey);

            let expectedRecordQueue = {
                disputeId: cs.disputeID,
                disputeEndTime: disputeConfig.disputeEndsAt,
                userVotedFor: {
                    reveal: {
                        key: userOne.user.publicKey,
                    }
                },
            }
            expect(JSON.stringify(recordState.claimQueue[0])).to.equal(JSON.stringify(expectedRecordQueue));
        });

        it('second_init_case!', async () => {
            let evidence = "Don't trust that bozo";
            await userTwo.initCase(cs.disputeID, evidence);

            // check dispute account status
            let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
            let expectedDisputeStatus = { voting: {} }
            expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expectedDisputeStatus));
            expect(disputeState.submittedCases).to.equal(2);

            // check case account
            let caseState = await cs.program.account.case.fetch(userTwo.case.publicKey);
            let expectedCase = {
                evidence: evidence,
                bump: userTwo.case.bump
            };
            expect(JSON.stringify(caseState)).to.equal(JSON.stringify(expectedCase));

            // check voter queue
            let recordState = await cs.program.account.voterRecord.fetch(userTwo.record.publicKey);

            let expectedRecordQueue = {
                disputeId: cs.disputeID,
                disputeEndTime: disputeConfig.disputeEndsAt,
                userVotedFor: {
                    reveal: {
                        key: userTwo.user.publicKey,
                    }
                },
            }
            expect(JSON.stringify(recordState.claimQueue[0])).to.equal(JSON.stringify(expectedRecordQueue));
        });
    });

    describe('vote!', () => {
        it('select_vote!', async () => {
            // mint tokens
            let repATA = await userThree.getOrCreateRepATA(userThree.user.publicKey, false);
            await cs.mintRepTokens(repATA.address, disputeOptions.voterRepRequired.toNumber());

            // call ix
            let hashArr = await userThree.selectVote(cs.disputeID, userTwo.user.publicKey);

            // check voter queue
            let recordState = await cs.program.account.voterRecord.fetch(userThree.record.publicKey);

            let expectedRecordQueue = {
                disputeId: cs.disputeID,
                disputeEndTime: disputeConfig.disputeEndsAt,
                userVotedFor: {
                    secret: {
                        hash: hashArr,
                    }
                },
            }
            expect(JSON.stringify(recordState.claimQueue[0])).to.equal(JSON.stringify(expectedRecordQueue));

            // check token transfer
            let repVault = cs.getRepATA(cs.dispute.publicKey);
            let expectedBalance = disputeOptions.protocolRep.toNumber() + 2*disputeOptions.partyRepCost.toNumber() + disputeOptions.voterRepCost.toNumber();
            let balance = await cs.getTokenBalance(repVault);

            expect(balance).to.eq(expectedBalance);

            // check record currently staked rep
            expect(recordState.currentlyStakedRep.eq(disputeConfig.voterRepCost)).to.be.true;
        });

        it('reveal_vote!', async () => {
            // calculate wait time
            let waitTime = 0;
            let curTime = Math.floor(Date.now() / 1000);
            let revealTime = disputeConfig.votingEndsAt.toNumber();
            if (curTime < revealTime) {
                waitTime = (revealTime - curTime + 5) * 1000;
            }

            // call reveal ix
            await new Promise<void>((resolve, reject) => {
                setTimeout(async () => {
                  try {
                    // call ix
                    await userThree.revealVote(cs.disputeID);

                    // check dispute account status
                    let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                    let expectedDisputeStatus = { reveal: {} }
                    expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expectedDisputeStatus));
                    expect(disputeState.votes[1].eq(new anchor.BN(1))).to.be.true;

                    // voter record reveal
                    let recordState = await cs.program.account.voterRecord.fetch(userThree.record.publicKey);
                    let expectedVote = {
                        reveal: {
                            key: userThree.votedFor,
                        }
                    }
                    expect(JSON.stringify(recordState.claimQueue[0].userVotedFor)).to.equal(JSON.stringify(expectedVote));

                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                }, waitTime); // wait until time
            });
        });
    });

    describe('claim!', () => {
        it('close_dispute!', async () => {
            let waitTime = 0.1;
            let curTime = Math.floor(Date.now() / 1000);
            let revealTime = disputeConfig.disputeEndsAt.toNumber();
            if (curTime < revealTime) {
                waitTime = (revealTime - curTime + 3) * 1000;
            }

            // call close ix
            await new Promise<void>((resolve, reject) => {
                setTimeout(async () => {
                  try {
                    // call ix
                    await cs.closeDispute();

                    // check dispute account status
                    let disputeState = await cs.program.account.dispute.fetch(cs.dispute.publicKey);
                    let expectedDisputeStatus = { 
                        concluded: {
                            winner: userThree.votedFor
                        }
                    }
                    expect(JSON.stringify(disputeState.status)).to.equal(JSON.stringify(expectedDisputeStatus));
                    expect(Object.keys(disputeState.status)[0]).to.equal("concluded");

                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                }, waitTime); // wait until time
            });
        });
    
        describe('claim_all!', () => {
            it('claim_loser!', async () => {
                await userOne.claim(cs.disputeID);

                // check record
                let recordState = await cs.program.account.voterRecord.fetch(userOne.record.publicKey);
                expect(recordState.claimQueue).to.be.empty;
                expect(recordState.currentlyStakedRep.eqn(0)).to.be.true;

                // check repATA
                let repATA = cs.getRepATA(userOne.user.publicKey);
                let balance = await cs.getTokenBalance(repATA);
                expect(balance).to.equal(0);
            });
            
            it('claim_winner!', async () => {
                await userTwo.claim(cs.disputeID);

                // check record
                let recordState = await cs.program.account.voterRecord.fetch(userTwo.record.publicKey);
                expect(recordState.claimQueue).to.be.empty;
                expect(recordState.currentlyStakedRep.eqn(0)).to.be.true;

                // check repATA
                let repAta = cs.getRepATA(userTwo.user.publicKey);
                let balance = await cs.getTokenBalance(repAta);
                expect(balance).to.equal(disputeOptions.partyRepCost.toNumber());
            });

            it('claim_voter!', async () => {
                await userThree.claim(cs.disputeID);

                // check record
                let recordState = await cs.program.account.voterRecord.fetch(userThree.record.publicKey);
                expect(recordState.claimQueue).to.be.empty;
                expect(recordState.currentlyStakedRep.eqn(0)).to.be.true;

                // check repATA
                let repAta = cs.getRepATA(userThree.user.publicKey);
                let balance = await cs.getTokenBalance(repAta);
                let expectedBalance = disputeOptions.voterRepRequired.add(disputeOptions.partyRepCost).add(disputeOptions.protocolRep);
                expect(balance).to.equal(expectedBalance.toNumber());
            });
        });
    });
});