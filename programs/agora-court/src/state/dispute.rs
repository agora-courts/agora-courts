use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeConfiguration {
    pub ends_at: i64,
}

impl DisputeConfiguration {
    pub const SIZE: usize = 8;
}

#[account]
pub struct Dispute {
    pub id: u64,
    pub users: Vec<Pubkey>,
    pub status: DisputeStatus,
    pub abstained_votes: u32,
    pub submitted_cases: usize,
    pub config: DisputeConfiguration,
    pub bump: u8,
}

impl Dispute {
    pub fn get_size(users: Vec<Pubkey>) -> usize {
        DISCRIMINATOR_SIZE
            + (4 + PUBKEY_BYTES * users.len())
            + 4
            + 4
            + DisputeConfiguration::SIZE
            + 1
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Waiting,
    Voting,
    Resolved { winner: Pubkey },
    Abstained,
}
