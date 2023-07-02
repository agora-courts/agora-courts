use crate::{error::InputError, state::{dispute::*, case::*, voter_record::*, Court}};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount, self};
use anchor_spl::associated_token::AssociatedToken;

pub fn edit_court(ctx: Context<EditCourt>, _court_name: String, max_dispute_votes: u16) -> Result<()> {
    

    Ok(())
}

#[derive(Accounts)]
#[instruction(_court_name: String)]
pub struct EditCourt<'info> {
    #[account(
        mut,
        seeds = ["court".as_bytes(), _court_name.as_bytes()], bump = court.bump,
    )]
    pub court: Account<'info, Court>,
    #[account(
        mut,
        constraint = court.edit_authority == authority.key()
    )]
    pub authority: Signer<'info>,
    ///CHECK: protocol that makes CPI has to sign for all init_disputes
    pub protocol: UncheckedAccount<'info>,
}