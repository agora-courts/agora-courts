use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

#[account]
pub struct Court {
    pub edit_authority: Pubkey,
    pub protocol: Pubkey,
    pub rep_mint: Pubkey, //Reputation token mint - if no reputation, specify a barrier to entry mint for voters
    pub pay_mint: Option<Pubkey>, //Mint to incentivize voters - can be the same as rep mint
    pub num_disputes: u64, //Tracks the number of disputes related to the protocol
    pub max_dispute_votes: u16, //Limits the number of simultaneous votes to disputes under same protocol
    pub bump: u8,
}

impl Court {
    pub const SIZE: usize = DISCRIMINATOR_SIZE + PUBKEY_BYTES + PUBKEY_BYTES + PUBKEY_BYTES + (PUBKEY_BYTES + 1) + 8 + 2 + 1;
}