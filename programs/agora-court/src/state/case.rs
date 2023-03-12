use crate::tools::anchor::DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;

#[account]
pub struct Case {
    pub votes: u64,
    pub evidence: String,
    pub bump: u8,
}

impl Case {
    pub fn get_size(evidence: &String) -> usize {
        DISCRIMINATOR_SIZE + 8 + (4 + evidence.len()) + 1
    }
}
