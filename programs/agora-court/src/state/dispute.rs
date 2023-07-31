use crate::{tools::anchor::DISCRIMINATOR_SIZE, error::InputError};
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeConfiguration {
    pub grace_ends_at: i64,      // block time when interaction can no longer be disputed
    pub init_cases_ends_at: i64, // block time when users can no longer submit cases
    pub voting_ends_at: i64,     // block time when voting ends
    pub dispute_ends_at: i64,    // block time when reveal of votes ends
    pub voter_rep_required: u64, // min # of tokens needed to vote on this dispute
    pub voter_rep_cost: u64,     // # of rep tokens for voters to deposit
    pub rep_cost: u64,           // # of rep tokens for parties to deposit
    pub pay_cost: u64,           // # of pay tokens for parties to deposit
    pub min_votes: u64,          // minimum votes needed to reach conclusion
    pub protocol_pay: u64,       // # of pay tokens the protocol itself provides
    pub protocol_rep: u64,       // # of rep tokens the protocol itself provides -- last two are optional and only necessary if the protocol wants to additionally incentivize voter participation
}

impl DisputeConfiguration {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Dispute {
    pub users: Vec<Option<Pubkey>>,
    pub votes: Vec<u64>,
    pub status: DisputeStatus,
    pub interactions: u8,
    pub submitted_cases: u8,
    pub config: DisputeConfiguration,
    pub bump: u8,
}
//note to self: need better flow checks between DisputeStatus enums (same issue aggregated from interact.rs warning)
impl Dispute {
    pub fn vote(&mut self, candidate: Pubkey) -> Result<()> {
        let idx: usize = self.users.iter().position(|&user| user == Some(candidate)).unwrap();
        self.votes[idx] += 1;
        Ok(())
    }

    pub fn total_votes(&self) -> u64 {
        self.votes.iter().sum()
    }

    pub fn leader_votes(&self) -> u64 {
        *self.votes.iter().max().unwrap()
    }

    pub fn get_size(users: &Vec<Option<Pubkey>>) -> usize {
        DISCRIMINATOR_SIZE
            + 4 + ((1 + PUBKEY_BYTES) * users.len())
            + 4 + (8 * users.len())
            + DisputeStatus::SIZE
            + 1 + 1
            + DisputeConfiguration::SIZE
            + 1
    }

    pub fn can_add_case(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;
        match self.status {
            DisputeStatus::Waiting => {
                if timestamp < self.config.init_cases_ends_at {
                    return Ok(());
                }
            },
            DisputeStatus::Grace => {
                if self.interactions == self.users.len() as u8 && timestamp < self.config.init_cases_ends_at {
                    self.status = DisputeStatus::Waiting;
                    return Ok(());
                }
            },
            _ => {}
        }

        err!(InputError::CasesNoLongerCanBeSubmitted)
    }

    pub fn can_vote(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;
        msg!("Status: {:#?}", self.status);
        match self.status {
            DisputeStatus::Voting => {
                if timestamp < self.config.voting_ends_at {
                    return Ok(());
                }
            },
            DisputeStatus::Waiting => {
                if (timestamp > self.config.init_cases_ends_at || self.submitted_cases == self.users.len() as u8) && timestamp < self.config.voting_ends_at {
                    self.status = DisputeStatus::Voting;
                    return Ok(());
                }
            },
            _ => {}
        }

        err!(InputError::DisputeNotVotable)
    }

    pub fn can_reveal(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;
        match self.status {
            DisputeStatus::Reveal => {
                if timestamp < self.config.dispute_ends_at {
                    return Ok(());
                }
            },
            DisputeStatus::Voting => {
                if timestamp > self.config.voting_ends_at && timestamp < self.config.dispute_ends_at {
                    self.status = DisputeStatus::Reveal;
                    return Ok(());
                } 
            },
            _ => {}
        }

        err!(InputError::NotRevealPeriod)
    }

    pub fn can_close(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;

        match self.status {
            DisputeStatus::Grace => {
                // conclude w no cases
                if timestamp > self.config.grace_ends_at && self.submitted_cases == 0 {
                    self.status = DisputeStatus::Concluded { winner: None };
                    return Ok(());
                }
            },
            DisputeStatus::Reveal => {
                // conclude w winner
                if timestamp > self.config.dispute_ends_at {
                    if self.total_votes() < self.config.min_votes {
                        self.status = DisputeStatus::Concluded { winner: None };
                    } else {
                        let max = self.leader_votes();
                        let count = self.votes.iter().filter(|&&x| x == max).count();
                        if count > 1 {
                            self.status = DisputeStatus::Concluded { winner: None }
                        } else {
                            let idx = self.votes.iter().position(|&x| x == max).unwrap();
                            self.status = DisputeStatus::Concluded { winner: self.users[idx] }
                        }
                    }
                    return Ok(());
                }
            },
            DisputeStatus::Voting => {
                // no one revealed
                if timestamp > self.config.dispute_ends_at {
                    self.status = DisputeStatus::Concluded { winner: None };
                    return Ok(());
                }
            },
            DisputeStatus::Waiting => {
                //no one ever voted
                if timestamp > self.config.voting_ends_at {
                    self.status = DisputeStatus::Concluded { winner: None };
                    return Ok(())
                }
            },
            _ => {}
        };

        err!(InputError::DisputeNotFinalizable)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DisputeStatus {
    Grace, //includes interactions and time for anyone to submit first case
    Waiting, //a case has been made, waiting for all evidence to be provided
    Voting, //evidence is in, voting now
    Reveal, //voting is finished, revealing encrypted votes
    Concluded { winner: Option<Pubkey> }, //winner declared or no dispute was started
}

impl DisputeStatus {
    pub const SIZE: usize = 1 + (1 + PUBKEY_BYTES);
}
