use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;

#[account]
pub struct Court {
    pub authority: Pubkey,
    pub num_disputes: u64,
    pub bump: u8,
}

impl Court {
    pub const SIZE: usize = DISCRIMINATOR_SIZE + 32 + 8 + 1;
}
