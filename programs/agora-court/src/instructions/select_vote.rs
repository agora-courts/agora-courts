use crate::{error::InputError, state::{dispute::*, voter_record::*, Court}};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount, self};
use anchor_spl::associated_token::AssociatedToken;

pub fn select_vote(
    ctx: Context<SelectVote>, 
    _court_name: String, 
    dispute_id: u64,
    commitment: [u8; 32]
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let voter_record = &mut ctx.accounts.voter_record;
    let user_ata = &mut ctx.accounts.user_rep_ata;

    //check timing / status
    dispute.can_vote()?;
    msg!("Dispute ID: {}", dispute_id);

    //already voted, update vote and return

    //push vote to binary heap
    let dispute_record = DisputeRecord {
        dispute_id,
        dispute_end_time: dispute.config.dispute_ends_at,
        user_voted_for: Vote::Secret { hash: commitment }
    };
    voter_record.push(dispute_record);

    //ensure user balance is sufficient
    let true_balance = voter_record.currently_staked_rep + user_ata.amount;
    if true_balance < dispute.config.voter_rep_required {
        return err!(InputError::UserDoesNotHaveEnoughReputation);
    }

    //transfer rep cost
    let rep_cost = dispute.config.voter_rep_cost;
    if rep_cost > 0 {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: user_ata.to_account_info(),
                to: ctx.accounts.rep_vault.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            }
        );

        token::transfer(cpi_ctx, rep_cost)?;
        voter_record.currently_staked_pay += rep_cost;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(
    _court_name: String,
    dispute_id: u64,
    commitment: [u8; 32]
)]
pub struct SelectVote<'info> {
    #[account(
        mut,
        seeds = ["record".as_bytes(), court.key().as_ref(), payer.key().as_ref()],
        bump = voter_record.bump,
        constraint = !voter_record.has_unclaimed_disputes()
                    @ InputError::UserHasUnclaimedDisputes,
        constraint = voter_record.claim_queue.len() < court.max_dispute_votes as usize
                    @ InputError::UserMaxDisputesReached,
        constraint = !voter_record.in_dispute(dispute_id) @ InputError::UserAlreadyProvidedCase
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Account<'info, Dispute>,

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = dispute
    )]
    pub rep_vault: Account<'info, TokenAccount>,

    #[account(
        seeds = ["court".as_bytes(), _court_name.as_bytes()],
        bump = court.bump,
    )]
    pub court: Box<Account<'info, Court>>,

    #[account(
        constraint = rep_mint.key() == court.rep_mint @ InputError::ReputationMintMismatch
    )]
    pub rep_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub payer: Signer<'info>, // user voting

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = payer,
    )]
    pub user_rep_ata: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>
}