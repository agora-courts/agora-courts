use crate::{constant::USER_MAX_DISPUTES, error::InputError, state::*};
use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(dispute_id: u64, evidence: String)]
pub struct InitializeCase<'info> {
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
        init,
        seeds = [b"case".as_ref(), court.key().as_ref(), dispute.key().as_ref(), payer.key().as_ref()],
        bump,
        payer = payer,
        space = Case::get_size(evidence)
    )]
    pub case: Account<'info, Case>,

    #[account(
        mut,
        seeds = [b"reputation".as_ref(), court_authority.key().as_ref(), payer.key().as_ref()],
        bump = reputation.bump,
        constraint = !reputation.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,

        constraint = reputation.claim_queue.len() < USER_MAX_DISPUTES
                    @ InputError::UserMaxDisputesReached,
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [b"dispute".as_ref(), court.key().as_ref(), u64::to_ne_bytes(dispute_id).as_ref()],
        bump = dispute.bump,
        constraint = dispute.can_add_case()
                    @ InputError::CasesNoLongerCanBeSubmitted,

        constraint = dispute.users.contains(&payer.key())
                    @ InputError::UserDoesNotHaveCase,
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        seeds = [b"court".as_ref(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Account<'info, Court>,

    /// CHECK: Creator of court.
    pub court_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, // user adding their case
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn initialize_case(ctx: Context<InitializeCase>, dispute_id: u64, evidence: String) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let reputation = &mut ctx.accounts.reputation;
    
    // Transfer arb_costs to escrow account
    let amount_to_transfer = dispute.config.arb_cost;
    let context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token.to_account_info(),
            to: ctx.accounts.dispute_token.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        }
    );
    transfer(context, amount_to_transfer)?;

    let case = &mut ctx.accounts.case;
    let bump = *ctx.bumps.get("case").unwrap();
    case.set_inner(Case {
        votes: 0,
        evidence,
        bump,
    });

    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: dispute.config.ends_at,
        user: ctx.accounts.payer.key(),
    };
    reputation.claim_queue.push(dispute_record);

    dispute.submitted_cases += 1;
    if dispute.submitted_cases == dispute.users.len() as u64 {
        dispute.status = DisputeStatus::Voting;
    }

    Ok(())
}