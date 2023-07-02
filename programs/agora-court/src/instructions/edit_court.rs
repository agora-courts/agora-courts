use crate::{error::InputError, state::Court};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

pub fn edit_court(
    ctx: Context<EditCourt>, 
    _court_name: String, 
    max_dispute_votes: u16
) -> Result<()> {
    let court = &mut ctx.accounts.court;

    court.edit(
        max_dispute_votes,
        ctx.accounts.transfer_authority.key(),
        ctx.accounts.transfer_protocol.key(),
        ctx.accounts.rep_mint.key(),
        &ctx.accounts.pay_mint
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    _court_name: String,
    max_dispute_votes: u16
)]
pub struct EditCourt<'info> {
    #[account(
        mut,
        seeds = ["court".as_bytes(), _court_name.as_bytes()], bump = court.bump,
    )]
    pub court: Account<'info, Court>,
    #[account(
        mut,
        constraint = court.edit_authority == authority.key() @ InputError::InvalidEditAuthority
    )]
    pub authority: Signer<'info>,
    ///CHECK: Old Authority must make sure this is correct, otherwise court is locked
    pub transfer_authority: UncheckedAccount<'info>,
    ///CHECK: New protocol that makes CPI has to sign for all init_disputes
    pub transfer_protocol: UncheckedAccount<'info>,
    pub rep_mint: Account<'info, Mint>,
    pub pay_mint: Option<Account<'info, Mint>>,
}