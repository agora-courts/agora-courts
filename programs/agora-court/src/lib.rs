use anchor_lang::prelude::*;
use instructions::*;
use state::*;

pub mod error;
pub mod instructions;
pub mod state;
pub mod tools;

declare_id!("xmLz8CwRQceUVYdHmPb72xASFE2eYYhsKUcetZbvRd7");

#[program]
pub mod agora_court {
    use super::*;

    pub fn interact(ctx: Context<Interact>, dispute_id: u64) -> Result<()> {
        instructions::interact(ctx, dispute_id)
    }

    pub fn claim(ctx: Context<Claim>, dispute_id: u64) -> Result<()> {
        instructions::claim(ctx, dispute_id)
    }

    pub fn close_dispute(ctx: Context<CloseDispute>, _dispute_id: u64) -> Result<()> {
        instructions::close_dispute(ctx, _dispute_id)
    }

    pub fn initialize_case(ctx: Context<InitializeCase>, dispute_id: u64, evidence: String) -> Result<()> {
        instructions::initialize_case(ctx, dispute_id, evidence)
    }

    pub fn initialize_court(ctx: Context<InitializeCourt>, reputation_mint: Pubkey, payment_mint: Option<Pubkey>, max_dispute_votes: u16) -> Result<()> {
        instructions::initialize_court(ctx, reputation_mint, payment_mint, max_dispute_votes)
    }

    pub fn initialize_dispute(
        ctx: Context<InitializeDispute>,
        users: Vec<Option<Pubkey>>,
        config: DisputeConfiguration,
    ) -> Result<()> {
        instructions::initialize_dispute(ctx, users, config)
    }

    pub fn initialize_record(ctx: Context<InitializeRecord>,) -> Result<()> {
        instructions::initialize_record(ctx)
    }

    pub fn vote(ctx: Context<Vote>, dispute_id: u64, user_case: Pubkey) -> Result<()> {
        instructions::vote(ctx, dispute_id, user_case)
    }
}
