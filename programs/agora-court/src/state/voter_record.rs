//use std::collections::BinaryHeap;
use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::tools::anchor::DISCRIMINATOR_SIZE;

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DisputeRecord {
    pub dispute_id: u64,
    pub dispute_end_time: i64,
    pub user_voted_for: Pubkey,
}

// impl Ord for DisputeRecord {
//     fn cmp(&self, other: &Self) -> std::cmp::Ordering {
//         self.dispute_end_time.cmp(&other.dispute_end_time).reverse()
//     }
// }

// impl PartialOrd for DisputeRecord {
//     fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
//         Some(self.cmp(other))
//     }
// }

// impl PartialEq for DisputeRecord {
//     fn eq(&self, other: &Self) -> bool {
//         self.dispute_id == other.dispute_id
//     }
// }

// impl Eq for DisputeRecord {}

impl DisputeRecord {
    pub const SIZE: usize = 8 + 8 + PUBKEY_BYTES;
}

#[account]
pub struct VoterRecord {
    // claim_queue represents the disputes that the user is a participant of in descending order of dispute end time.
    pub claim_queue: Vec<DisputeRecord>,    //replaced binary heap with vec, fastest min heap i could get working for now
    pub currently_staked_rep: u64,
    pub currently_staked_pay: u64,
    pub bump: u8,
}

impl VoterRecord {
    pub fn get_size(max_disputes: u16) -> usize {
        DISCRIMINATOR_SIZE + 4 + (DisputeRecord::SIZE * (max_disputes as usize)) + 8 + 8 + 1 //includes zero entry overhead, no realloc functionality (yet)
    }

    pub fn in_dispute(&self, dispute_id: u64) -> bool {
        self.claim_queue
            .iter()
            .any(|record| record.dispute_id == dispute_id)
    }

    pub fn has_unclaimed_disputes(&self) -> bool {
        if let Some(record) = self.peek() {
            record.dispute_end_time < Clock::get().unwrap().unix_timestamp 
        } else {
            false
        }
    }

    pub fn push(&mut self, item: DisputeRecord) {
        let pos = match self.claim_queue.iter().position(|p| p.dispute_end_time <= *&item.dispute_end_time) {
            Some(i) => i,
            None => self.claim_queue.len()
        };

        self.claim_queue.insert(pos, item);
    }

    pub fn pop(&mut self) -> Option<DisputeRecord> {
        self.claim_queue.pop()
    }

    pub fn peek(&self) -> Option<&DisputeRecord> {
        self.claim_queue.last()
    }
}
