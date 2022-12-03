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

    pub fn create_dispute(
        ctx: Context<CreateDispute>,
        users: Vec<Pubkey>,
        order_price: u64,
        config: DisputeConfiguration,
    ) -> Result<()> {
        instructions::create_dispute(ctx, users, order_price, config)
    }

    pub fn create_case(ctx: Context<CreateCase>, dispute_id: u64, evidence: String) -> Result<()> {
        instructions::create_case(ctx, dispute_id, evidence)
    }
}
