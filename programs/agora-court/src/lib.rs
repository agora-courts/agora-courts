use anchor_lang::prelude::*;
use instructions::*;
use state::*;

pub mod constant;
pub mod error;
pub mod instructions;
pub mod state;
pub mod tools;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod agora_court {
    use super::*;

    pub fn claim(ctx: Context<Claim>, dispute_id: u64) -> Result<()> {
        instructions::claim(ctx, dispute_id)
    }

    pub fn close_dispute(ctx: Context<CloseDispute>, _dispute_id: u64) -> Result<()> {
        instructions::close_dispute(ctx, _dispute_id)
    }

    pub fn initialize_case(ctx: Context<InitializeCase>, dispute_id: u64, evidence: String) -> Result<()> {
        instructions::initialize_case(ctx, dispute_id, evidence)
    }

    pub fn initialize_court(ctx: Context<InitializeCourt>) -> Result<()> {
        instructions::initialize_court(ctx)
    }

    pub fn initialize_dispute(
        ctx: Context<InitializeDispute>,
        users: Vec<Pubkey>,
        config: DisputeConfiguration,
    ) -> Result<()> {
        instructions::initialize_dispute(ctx, users, config)
    }

    pub fn initialize_reputation(ctx: Context<InitializeReputation>,) -> Result<()> {
        instructions::initialize_reputation(ctx)
    }

    pub fn vote(ctx: Context<Vote>, dispute_id: u64, user_case: Pubkey) -> Result<()> {
        instructions::vote(ctx, dispute_id, user_case)
    }
}
