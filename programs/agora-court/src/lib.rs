use anchor_lang::prelude::*;
use instructions::*;
use state::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod tools;

declare_id!("ABkQZCq2qh32X75A5FjaT8FGRWEqujPiBV3wJZEmzuEX");

#[program]
pub mod agora_court {
    use super::*;

    pub fn interact(
        ctx: Context<Interact>, 
        court_name: String, 
        dispute_id: u64
    ) -> Result<()> {
        instructions::interact(ctx, court_name, dispute_id)
    }

    pub fn claim(
        ctx: Context<Claim>, 
        court_name: String, 
        dispute_id: u64
    ) -> Result<()> {
        instructions::claim(ctx, court_name, dispute_id)
    }

    pub fn close_dispute(
        ctx: Context<CloseDispute>, 
        dispute_id: u64
    ) -> Result<()> {
        instructions::close_dispute(ctx, dispute_id)
    }

    pub fn initialize_case(
        ctx: Context<InitializeCase>,
        court_name: String,
        dispute_id: u64, 
        evidence: String) -> Result<()> {
        instructions::initialize_case(ctx, court_name, dispute_id, evidence)
    }

    pub fn initialize_court(
        ctx: Context<InitializeCourt>,
        court_name: String,
        max_dispute_votes: u16
    ) -> Result<()> {
        instructions::initialize_court(ctx, court_name, max_dispute_votes)
    }

    pub fn edit_court(
        ctx: Context<EditCourt>,
        court_name: String,
        max_dispute_votes: u16
    ) -> Result<()> {
        instructions::edit_court(ctx, court_name, max_dispute_votes)
    }

    pub fn initialize_dispute(
        ctx: Context<InitializeDispute>,
        court_name: String,
        users: Vec<Option<Pubkey>>,
        config: DisputeConfiguration,
    ) -> Result<()> {
        instructions::initialize_dispute(ctx, court_name, users, config)
    }

    pub fn select_vote(
        ctx: Context<SelectVote>,
        court_name: String,
        dispute_id: u64,
        commitment: [u8; 32]
    ) -> Result<()> {
        instructions::select_vote(ctx, court_name, dispute_id, commitment)
    }

    pub fn reveal_vote(
        ctx: Context<RevealVote>,
        court_name: String,
        dispute_id: u64,
        salt: String,
    ) -> Result<()> {
        instructions::reveal_vote(ctx, court_name, dispute_id, salt)
    }

    pub fn initialize_record(
        ctx: Context<InitializeRecord>, 
        court_name: String
    ) -> Result<()> {
        instructions::initialize_record(ctx, court_name)
    }
}
