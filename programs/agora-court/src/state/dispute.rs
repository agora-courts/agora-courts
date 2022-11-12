use anchor_lang::{prelude::*, solana_program::pubkey::PUBKEY_BYTES};

use crate::{error::InputError, tools::anchor::DISCRIMINATOR_SIZE};

use super::Case;

const NUM_CASES: usize = 2;

#[account]
pub struct Dispute {
    pub court: Pubkey,
    pub users: Vec<Pubkey>,
    pub status: DisputeStatus,
    pub abstained_votes: u32,
    pub submitted_cases: usize,
    pub ends_at: i64,
}

impl Dispute {
    pub fn get_space(users: Vec<Pubkey>) -> usize {
        DISCRIMINATOR_SIZE + PUBKEY_BYTES + (4 + PUBKEY_BYTES * users.len()) + 4 + 4 + 4 + 8 + 8
    }

    pub fn initialize(&mut self, court: Pubkey, users: Vec<Pubkey>) -> Result<()> {
        self.court = court;
        self.users = users;
        self.status = DisputeStatus::Waiting;
        self.abstained_votes = 0;
        self.submitted_cases = 0;
        Ok(())
    }

    pub fn require_can_vote(&self) -> Result<()> {
        require!(
            self.status == DisputeStatus::Voting,
            InputError::DisputeNotVotable
        );
        Ok(())
    }

    pub fn case_submitted(&mut self) -> Result<()> {
        self.submitted_cases += 1;
        if self.submitted_cases == self.users.len() {
            self.status = DisputeStatus::Voting;
        }
        Ok(())
    }

    pub fn add_abstained_vote(&mut self) -> Result<()> {
        require!(
            self.status == DisputeStatus::Voting,
            InputError::DisputeNotVotable
        );
        let now_ts = Clock::get().unwrap().unix_timestamp;
        require!(now_ts < self.ends_at, InputError::DisputeNotVotable);
        self.abstained_votes += 1;
        Ok(())
    }

    // pub fn rule(&mut self, cases: Vec<Case>) -> Result<()> {
    //     require!(
    //         self.status == DisputeStatus::Voting,
    //         InputError::DisputeNotVotable
    //     );
    //     let now_ts = Clock::get().unwrap().unix_timestamp;
    //     require!(now_ts >= self.ends_at, InputError::DisputeNotFinalizable);
    //     let mut winning_case: Option<Case> = None;
    //     let mut winning_votes: u32 = 0;
    //     for case in cases.iter() {
    //         if case.votes > winning_votes {
    //             winning_case = Some(case);
    //             winning_votes = case.votes;
    //         }
    //     }
    //     if winning_votes > self.abstained_votes {
    //         self.status = DisputeStatus::Resolved {
    //             winner: winning_case.unwrap().user,
    //         };
    //     } else {
    //         self.status = DisputeStatus::Abstained;
    //     }
    //     Ok(())
    // }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Waiting,
    Voting,
    Resolved { winner: Pubkey },
    Abstained,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Vote {
    Abstain,
    For { case: Case },
}
