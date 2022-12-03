use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeConfiguration {
    pub ends_at: i64,      // block time of either expiration or end of voting period
    pub rep_required: u64, // min amt of rep needed to vote on this dispute
    pub arb_cost: u64,     // cost for user to add their case
    pub rep_risked: u32,   // amt to increment winning/decrement losing voter's reputation by
}

impl DisputeConfiguration {
    pub const SIZE: usize = 8 + 8 + 8;
}

#[account]
pub struct Dispute {
    pub id: u64,
    pub users: Vec<Pubkey>,
    pub status: DisputeStatus,
    pub submitted_cases: usize,
    pub config: DisputeConfiguration,
    pub bump: u8,
}

impl Dispute {
    pub fn get_size(users: Vec<Pubkey>) -> usize {
        DISCRIMINATOR_SIZE
            + PUBKEY_BYTES
            + 8
            + (4 + PUBKEY_BYTES * users.len())
            + (1 + PUBKEY_BYTES)
            + 4
            + 8
            + DisputeConfiguration::SIZE
            + 1
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Waiting,
    Voting,
    Resolved { winner: Pubkey },
}
