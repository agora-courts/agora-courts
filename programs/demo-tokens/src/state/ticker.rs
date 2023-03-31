use anchor_lang::prelude::*;

#[account]
pub struct Ticker {
    pub address: String,
    pub image: String,
    pub name: String,
    pub ticker: String,
    pub description: String,
    pub badges: Vec<String>,
}

impl Ticker {
    pub fn get_size(a: String, i: String, n: String, t: String, d: String, b: Vec<String>) -> usize {
        let mut lens: usize = 0;
        for str in &b {
            lens += 4 + str.len();
        }

        8 + 4 + a.len() + 4 + i.len() + 4 + n.len() + 4 + t.len() + 4 + d.len() + 4 + b.len() + lens
    }
}