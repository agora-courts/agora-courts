use anchor_lang::error_code;

#[error_code]
pub enum InputError {
    #[msg("An account for this pubkey already exists")]
    AccountDuplicate,
    #[msg("Username too long.")]
    LongNickname,
    #[msg("Please use a valid profile picture.")]
    InvalidPfp,
    #[msg("You are already friends with this user.")]
    DuplicateFriend,
    #[msg("You are not currently friends with this user.")]
    FriendNotFound,
}