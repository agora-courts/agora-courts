use crate::{tools::anchor::DISCRIMINATOR_SIZE, error::InputError};
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeConfiguration {
    pub grace_ends_at: i64,      // block time when interaction can no longer be disputed
    pub init_cases_ends_at: i64, // block time when users can no longer submit cases
    pub ends_at: i64,            // block time of end of voting period
    pub voter_rep_required: u64, // min # of tokens needed to vote on this dispute
    pub voter_rep_cost: u64,     // # of rep tokens for voters to deposit
    pub rep_cost: u64,           // # of rep tokens for parties to deposit
    pub pay_cost: u64,           // # of pay tokens for parties to deposit
    pub min_votes: u64,           // minimum votes needed to reach conclusion
    pub protocol_pay: u64,       // # of pay tokens the protocol itself provides
    pub protocol_rep: u64,       // # of rep tokens the protocol itself provides -- last two are optional and only necessary if the protocol wants to additionally incentivize voter participation
}

impl DisputeConfiguration {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct CaseLeader {
    pub user: Pubkey,
    pub votes: u64,
}

impl CaseLeader {
    pub const SIZE: usize = PUBKEY_BYTES + 8;
}

#[account]
pub struct Dispute {
    pub users: Vec<Option<Pubkey>>,
    pub status: DisputeStatus,
    pub interactions: u8,
    pub submitted_cases: u8,
    pub votes: u64,
    pub leader: CaseLeader,
    pub config: DisputeConfiguration,
    pub bump: u8,
}
//note to self: need better flow checks between DisputeStatus enums (same issue aggregated from interact.rs warning)
impl Dispute {
    pub fn get_size(users: &Vec<Option<Pubkey>>) -> usize {
        DISCRIMINATOR_SIZE
            + 4 + ((1 + PUBKEY_BYTES) * users.len())
            + (1 + (1 + PUBKEY_BYTES))
            + 1 + 1 + 8
            + CaseLeader::SIZE
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
                err!(InputError::CasesNoLongerCanBeSubmitted)
            },
            DisputeStatus::Grace => {
                if (timestamp > self.config.grace_ends_at || self.interactions == self.users.len() as u8) && timestamp < self.config.init_cases_ends_at {
                    self.status = DisputeStatus::Waiting;
                    return Ok(());
                }
                err!(InputError::CasesNoLongerCanBeSubmitted)
            },
            _ => err!(InputError::CasesNoLongerCanBeSubmitted)
        }
    }

    pub fn can_vote(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;
        match self.status {
            DisputeStatus::Voting => {
                if timestamp < self.config.ends_at {
                    return Ok(());
                }
                err!(InputError::DisputeNotVotable)
            },
            DisputeStatus::Waiting => {
                if (timestamp > self.config.init_cases_ends_at || self.submitted_cases == self.users.len() as u8) && timestamp < self.config.ends_at {
                    self.status = DisputeStatus::Voting;
                    return Ok(());
                }
                err!(InputError::DisputeNotVotable)
            },
            _ => err!(InputError::DisputeNotVotable)
        }
    }

    pub fn can_close(&mut self) -> Result<()> {
        let timestamp = Clock::get().unwrap().unix_timestamp;

        match self.status {
            DisputeStatus::Grace => {
                if timestamp > self.config.grace_ends_at && self.submitted_cases == 0 {
                    //conclude w no cases
                    self.status = DisputeStatus::Concluded { winner: None };
                    return Ok(());
                }
            },
            DisputeStatus::Voting => {
                if timestamp > self.config.ends_at {
                    //conclude w winner
                    self.status = DisputeStatus::Concluded { winner: Some(self.leader.user) };
                    return Ok(());
                }
            },
            _ => {}
        };

        err!(InputError::DisputeNotFinalizable)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Grace, //includes interactions and time for anyone to submit first case
    Waiting, //a case has been made, waiting for all evidence to be processed
    Voting, //evidence is in, voting now
    Concluded { winner: Option<Pubkey> }, //winner declared or no dispute was started
}
