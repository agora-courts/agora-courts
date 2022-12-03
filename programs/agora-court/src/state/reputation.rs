use std::collections::BinaryHeap;

use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::tools::anchor::DISCRIMINATOR_SIZE;

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeRecord {
    pub dispute_id: u64,
    pub dispute_end_time: i64,
    pub case: Pubkey,
}

impl Ord for DisputeRecord {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.dispute_end_time.cmp(&other.dispute_end_time).reverse()
    }
}

impl PartialOrd for DisputeRecord {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for DisputeRecord {
    fn eq(&self, other: &Self) -> bool {
        self.dispute_id == other.dispute_id
    }
}

impl Eq for DisputeRecord {}

impl DisputeRecord {
    pub const SIZE: usize = 8 + PUBKEY_BYTES;
}

#[account]
pub struct Reputation {
    pub reputation: u64,
    // claim_queue represents the disputes that the user
    // is a participant of in order of dispute end time.
    pub claim_queue: BinaryHeap<DisputeRecord>,
    pub bump: u8,
}

impl Reputation {
    pub fn get_size(max_disputes: usize) -> usize {
        DISCRIMINATOR_SIZE + (4 + (DisputeRecord::SIZE * max_disputes)) + 1
    }

    pub fn add_reputation(&mut self, plus_rep: u32) {
        self.reputation = self.reputation.saturating_add(plus_rep as u64);
    }

    pub fn sub_reputation(&mut self, minus_rep: u32) {
        self.reputation = self.reputation.saturating_sub(minus_rep as u64);
    }

    pub fn in_dispute(&self, dispute_id: u64) -> bool {
        self.claim_queue
            .iter()
            .any(|record| record.dispute_id == dispute_id)
    }

    pub fn has_unclaimed_disputes(&self) -> bool {
        self.claim_queue.peek().is_none()
            || self.claim_queue.peek().unwrap().dispute_end_time
                < Clock::get().unwrap().unix_timestamp
    }
}
