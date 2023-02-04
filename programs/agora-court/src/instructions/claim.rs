use crate::{error::InputError, state::*};
use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(dispute_id: u64)]
pub struct Claim<'info> {
    #[account(
        mut, 
        associated_token::mint = mint,
        associated_token::authority = dispute,
    )]
    pub dispute_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = payer,   
    )]
    pub user_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump = reputation.bump,
        constraint = reputation.has_unclaimed_disputes()
                    @ InputError::UserHasNoUnclaimedDisputes,

        constraint = reputation.claim_queue.peek().unwrap().dispute_id == dispute_id
                    @ InputError::UserCannotClaimDispute,
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court_authority.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = matches!(dispute.status, DisputeStatus::Concluded { .. })
                    @ InputError::DisputeNotClaimable,
   )]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: Creator of court.
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn claim(ctx: Context<Claim>, _dispute_id: u64) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let dispute_token = &mut ctx.accounts.dispute_token;
    let reputation = &mut ctx.accounts.reputation;

    let _payer = &mut ctx.accounts.payer;
    let _voted_on = reputation.claim_queue.pop().unwrap().user;

    // Refund arb_cost to winning party.
    if matches!(
        dispute.status,
        DisputeStatus::Concluded {
            winner: Some(_payer)
        }
    ) {
        let amount_to_transfer = dispute.config.arb_cost;
        let context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: dispute_token.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: dispute.to_account_info(),
            }
        );
        transfer(context, amount_to_transfer)?;

        reputation.add_reputation(dispute.config.tkn_risked);
        return Ok(())
    }

    // Distribute arb_cost of loser(s) party to winning voters.
    if matches!(dispute.status, DisputeStatus::Concluded { winner: None }) {
        
    } else if matches!(
        dispute.status,
        DisputeStatus::Concluded {
            winner: Some(_voted_on)
        }
    ) {
        let amount_to_transfer = ((dispute.submitted_cases - 1) * dispute.config.arb_cost) / dispute.leader.votes;
        let context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: dispute_token.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: dispute.to_account_info(),
            }
        );
        transfer(context, amount_to_transfer)?;

        reputation.add_reputation(dispute.config.tkn_risked);
    } else {
        reputation.sub_reputation(dispute.config.tkn_risked);
    }

    Ok(())
}