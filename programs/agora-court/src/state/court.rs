use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[account]
pub struct Court {
    pub authority: Pubkey, // program interfacing with Agora Court
    pub num_disputes: u64,
    pub bump: u8,
}

impl Court {
    pub const SIZE: usize = DISCRIMINATOR_SIZE + PUBKEY_BYTES + 8 + 1;
}