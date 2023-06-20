use anchor_lang::prelude::*;

#[account]
pub struct Protocol {
    pub bump: u8,
    pub num_tickers: u64,
}