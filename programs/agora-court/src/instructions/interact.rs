use crate::{error::{InputError}, state::dispute::*, state::{court::Court, voter_record::VoterRecord}};
use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, TokenAccount, transfer, Token, Transfer}, associated_token::AssociatedToken};

//when a user interacts, lock up their funds for a set amount of time as specified by the protocol
//this is a CPI from the actual protocol
//ata -> derived from record account
//ata would hold amounts
//issue is keeping track of expiration date and allowing disputes to be created from this without having the protocol need to sign again
//have them basically create the dispute, but without the dispute account encoding until someone opens it up

//also allow all other users to interact with an existing dispute, need to edit dispute status enum to include a grace period
//literally does nothing when no dispute is created by one of the users involved
//a way to keep track of how those ppl interacted

//interact function actually slashes users, then eventually returns funds if dispute is not created before end of grace period

pub fn interact(
    ctx: Context<Interact>,
    _dispute_id: u64
) -> Result<()> {
    //checking timing
    let dispute = &mut ctx.accounts.dispute;
    let timestamp = Clock::get().unwrap().unix_timestamp;
    require!(timestamp < dispute.config.grace_ends_at, InputError::InteractionPeriodEnded);

    //check dispute status
    require!(DisputeStatus::Grace == dispute.status, InputError::InteractionPeriodEnded);
    require!(dispute.interactions < dispute.users.len() as u8, InputError::InteractionsFulfilled);
    drop(dispute);

    let users = &mut ctx.accounts.dispute.users;

    let signer = &ctx.accounts.user.key();
    
    let mut idx: Option<usize> = None;

    for i in 0..users.len() {
        if let Some(pubkey) = users[i] {
            if pubkey == *signer {
                idx = Some(i);
                break;
            }
        } else if idx.is_none() {
            idx = Some(i);
        }
    }
    
    //based on none or some, do transfer / return err
    if idx.is_none() {
        return err!(InputError::UserNotAuthorized);
    }

    let i = idx.unwrap();
    if users[i].is_none() {
        users[i] = Some(*signer);
    }

    //transfer correct money to vault pool
    let provided_rep = ctx.accounts.dispute.config.rep_cost;
    let provided_pay = ctx.accounts.dispute.config.pay_cost;

    //transfer rep tokens from user -> vault
    if provided_rep > 0 {
        let user_ata = &mut ctx.accounts.user_rep_ata;

        if let Some(acc) = user_ata {
            let cpi_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: acc.to_account_info(),
                    to: ctx.accounts.rep_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info()
                }
            );

            transfer(cpi_ctx, provided_rep)?;
            ctx.accounts.record.currently_staked_rep += provided_rep;
        } else {
            return err!(InputError::ReputationAtaMissing);
        }
    }

    //transfer pay tokens from user -> vault
    if provided_pay > 0 {
        let user_ata = &mut ctx.accounts.user_pay_ata;
        let vault_ata = &mut ctx.accounts.pay_vault;

        if let (Some(user_acc), Some(vault_acc), Some(mint), Some(mint_acc)) = (user_ata, vault_ata, ctx.accounts.court.pay_mint, &ctx.accounts.pay_mint) {
            require!(mint_acc.key() == mint, InputError::ProtocolMintMismatch);

            let cpi_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: user_acc.to_account_info(),
                    to: vault_acc.to_account_info(),
                    authority: ctx.accounts.user.to_account_info()
                }
            );

            transfer(cpi_ctx, provided_pay)?;
            ctx.accounts.record.currently_staked_pay += provided_pay;
        } else {
            return err!(InputError::PaymentAtaMissing);
        }
    }

    //inc interact field in account
    let num = &mut ctx.accounts.dispute.interactions;
    *num += 1;

    //WARNING: 
    //The following has not been implemented yet (due to time constraints for grizzlython :D), 
    //but we need a way to prevent people from interacting more than once and 
    //keeping track of who has interacted / who has not. This can be done very easily
    //with a simple Vec<bool> since it marks who has voted and who has not. This changes A LOT in other files too. 
    //Will be done ASAP.

    //^This should theoretically be on the protocol to make sure of that, but it's good to double check on our end.

    //What if someone wants to add their case before all users have interacted?
    //Whether this should be implemented is TBD.

    Ok(())
}


#[derive(Accounts)]
#[instruction(_dispute_id: u64)]
pub struct Interact<'info> {
    #[account(
        mut,
        seeds = ["dispute".as_bytes(), court.key().as_ref(), _dispute_id.to_be_bytes().as_ref()],
        bump = dispute.bump,
    )]
    pub dispute: Box<Account<'info, Dispute>>,

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = dispute
    )]
    pub rep_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = dispute
    )]
    pub pay_vault: Option<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = ["record".as_bytes(), court.key().as_ref(), user.key().as_ref()],
        bump = record.bump,
    )]
    pub record: Box<Account<'info, VoterRecord>>,

    #[account(
        mut,
        seeds = ["court".as_bytes(), court_authority.key().as_ref()],
        bump = court.bump,
    )]
    pub court: Box<Account<'info, Court>>,

    /// CHECK: The creator of the court should not need to sign here - it won't be the right court anyway if wrong address passed
    pub court_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = pay_mint,
        associated_token::authority = user
    )]
    pub user_pay_ata: Option<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = rep_mint,
        associated_token::authority = user,
    )]
    pub user_rep_ata: Option<Account<'info, TokenAccount>>,

    #[account(
        constraint = rep_mint.key() == court.rep_mint @ InputError::ReputationMintMismatch
    )]
    pub rep_mint: Account<'info, Mint>,

    pub pay_mint: Option<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>
} 