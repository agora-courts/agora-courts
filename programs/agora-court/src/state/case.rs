use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::error::InputError;

#[account]
pub struct Case {
    pub dispute: Pubkey,
    pub votes: u32,
    pub evidence: String,
}

impl Case {
    pub fn get_space(evidence: String) -> usize {
        PUBKEY_BYTES + 4 + (4 + evidence.len())
    }

    pub fn initialize(&mut self, dispute: Pubkey, evidence: String) -> Result<()> {
        self.evidence = evidence;
        self.votes = 0;
        Ok(())
    }

    pub fn add_vote(&mut self) -> Result<()> {
        self.votes += 1;
        Ok(())
    }
}
