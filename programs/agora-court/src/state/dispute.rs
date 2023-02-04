use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeConfiguration {
    pub init_cases_ends_at: i64, // time when users can no longer submit cases
    pub ends_at: i64,            // block time of end of voting period
    pub tkn_required: u64,       // min amt of tokens needed to vote on this dispute
    pub tkn_risked: u64,         // amt to increment winning/decrement losing voter's token count by
    pub arb_cost: u64,           // cost for user to add their case
    pub min_votes: u64           // minimum votes needed to reach conclusion
}

impl DisputeConfiguration {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 8 + 8;
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
    // pub id: u64,
    pub users: Vec<Pubkey>,
    pub status: DisputeStatus,
    pub submitted_cases: u64,
    pub leader: CaseLeader,
    pub config: DisputeConfiguration,
    pub bump: u8,
}

impl Dispute {
    pub fn get_size(users: Vec<Pubkey>) -> usize {
        DISCRIMINATOR_SIZE
            + 8
            + (4 + PUBKEY_BYTES * users.len())
            + (1 + (1 + PUBKEY_BYTES))
            + 8
            + CaseLeader::SIZE
            + DisputeConfiguration::SIZE
            + 1
    }

    pub fn can_add_case(&self) -> bool {
        self.status == DisputeStatus::Waiting
            && Clock::get().unwrap().unix_timestamp < self.config.init_cases_ends_at
    }

    pub fn can_vote(&self) -> bool {
        self.status == DisputeStatus::Voting
            && Clock::get().unwrap().unix_timestamp < self.config.ends_at
    }

    pub fn can_close(&self) -> bool {
        (self.status == DisputeStatus::Waiting
            && Clock::get().unwrap().unix_timestamp >= self.config.init_cases_ends_at)
        || (self.status == DisputeStatus::Voting
            && Clock::get().unwrap().unix_timestamp >= self.config.ends_at)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Waiting,
    Voting,
    Concluded { winner: Option<Pubkey> },
}
